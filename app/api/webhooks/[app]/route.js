// ============================================================
// Inbound webhooks. Signature is verified BEFORE anything is accepted, then the
// same idempotent upsert handles the payload — so delivery order never matters
// and a replayed delivery changes nothing (README §5).
//
// WhatsApp / Meta (VERIFIED — see README §9):
//   GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…  -> echo challenge
//   POST body signed as: X-Hub-Signature-256: sha256=HMAC_SHA256(rawBody, appSecret)
// ============================================================
import { NextResponse } from 'next/server';
import { whatsapp } from '../../../../lib/connectors';
import { getConnector } from '../../../../lib/connectors';
import { upsertRecords } from '../../../../lib/store';
import { audit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Meta subscription handshake. */
export async function GET(req, { params }) {
  const app = params.app;
  if (app !== 'whatsapp' && app !== 'meta') {
    return NextResponse.json({ error: 'unknown webhook' }, { status: 404 });
  }
  const challenge = whatsapp.verifyChallenge(req.nextUrl.searchParams);
  if (!challenge) {
    await audit({ action: 'webhook.verify', target: app, result: 'failure', reason: 'verify token mismatch' });
    return new NextResponse('forbidden', { status: 403 });
  }
  await audit({ action: 'webhook.verify', target: app, result: 'success' });
  // Must be the raw challenge string, as text/plain.
  return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(req, { params }) {
  const app = params.app;

  // RAW body — re-serialising JSON would change the digest.
  const raw = await req.text();

  if (app === 'whatsapp' || app === 'meta') {
    const sig = req.headers.get('x-hub-signature-256');
    if (!whatsapp.verifySignature(raw, sig)) {
      await audit({ action: 'webhook.receive', target: app, result: 'denied', reason: 'signature mismatch' });
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    let payload = {};
    try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }, { status: 200 }); }

    // Idempotent: a replayed delivery converges on the same state.
    const rows = (payload?.entry || []).flatMap((e, ei) =>
      (e?.changes || []).map((c, ci) => ({
        sourceId: `${e.id || 'entry'}-${ei}-${ci}-${c?.value?.metadata?.timestamp || 'na'}`,
        kind: c?.field || 'unknown',
        receivedAt: new Date().toISOString(),
      }))
    );
    const result = rows.length ? await upsertRecords('whatsapp', rows) : { inserted: 0, updated: 0, rejected: 0, stored: 0 };

    await audit({ action: 'webhook.receive', target: app, result: 'success', detail: result });
    // Always acknowledge once verified, so Meta does not retry.
    return NextResponse.json({ ok: true, ...result });
  }

  // First-party apps: per-app shared secret, same rules.
  const adapter = getConnector(app);
  if (!adapter) return NextResponse.json({ error: 'unknown webhook' }, { status: 404 });

  const secret = process.env[`${app.toUpperCase().replace(/-/g, '_')}_WEBHOOK_SECRET`];
  const sig = req.headers.get('x-playbeat-signature');
  if (!secret || !sig) {
    await audit({ action: 'webhook.receive', target: app, result: 'denied', reason: 'no shared secret configured' });
    return NextResponse.json({ error: 'webhook not configured' }, { status: 401 });
  }

  const crypto = await import('node:crypto');
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await audit({ action: 'webhook.receive', target: app, result: 'denied', reason: 'signature mismatch' });
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload = {};
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const rows = Array.isArray(payload) ? payload : [payload];
  const result = await upsertRecords(app, rows.filter((r) => r && r.sourceId));
  await audit({ action: 'webhook.receive', target: app, result: 'success', detail: result });
  return NextResponse.json({ ok: true, ...result });
}
