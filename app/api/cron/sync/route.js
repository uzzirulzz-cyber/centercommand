// ============================================================
// Scheduled sync workers — the cron entry point.
//
// Vercel Cron calls this on the schedule declared in vercel.json. It can also
// be triggered by any external scheduler with the same secret, so the cadence
// is not tied to the hosting plan. Every run is audited.
//
// Auth: `Authorization: Bearer $CRON_SECRET` (what Vercel sends),
//       `x-cron-secret: $CRON_SECRET`, or `?secret=$CRON_SECRET`.
// ============================================================
import { NextResponse } from 'next/server';
import { runAllWorkers } from '../../../../lib/workers';
import { audit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, reason: 'CRON_SECRET is not configured' };
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const header = req.headers.get('x-cron-secret') || '';
  const query = new URL(req.url).searchParams.get('secret') || '';
  if (bearer === secret || header === secret || query === secret) return { ok: true };
  return { ok: false, reason: 'invalid cron secret' };
}

export async function GET(req) {
  const auth = authorized(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });

  const only = new URL(req.url).searchParams.get('app');
  const summary = await runAllWorkers({ only: only ? [only] : null });
  await audit({
    action: 'workers.run',
    actor: 'cron',
    target: only || 'all',
    result: summary.synced > 0 ? 'success' : (summary.failed > 0 ? 'failure' : 'skipped'),
    detail: summary.results,
  });
  return NextResponse.json({ ok: true, ...summary });
}
