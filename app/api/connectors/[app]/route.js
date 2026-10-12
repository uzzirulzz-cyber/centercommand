// ============================================================
// /api/connectors/[app] — the guarded gateway to every application (README §8.4).
// All provider credentials stay server-side; nothing here is reachable without
// a valid session AND the right role AND the right app scope.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { getConnector, connectorStatus, whatsapp } from '../../../../lib/connectors';
import { allRecords, getSyncState } from '../../../../lib/store';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { breakerOpen } from '../../../../lib/http';
import { hydrateConnectorEnv } from '../../../../lib/connectors/storeCreds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function deny(session, action, app, status, extra = {}) {
  const reason = denyReason(session, action, app);
  await audit({
    action: 'authz.denied',
    actor: session?.email || 'anonymous',
    role: session?.role || null,
    target: `${action} ${app}`,
    result: 'denied',
    reason,
  });
  return NextResponse.json({ error: 'forbidden', reason, ...extra }, { status });
}

/** GET — connector status + the records we hold for this app. */
export async function GET(req, { params }) {
  const app = params.app;
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // WhatsApp is a shared integration, not one of the five registered apps.
  if (app === 'whatsapp') {
    if (!can(session, 'crm:assign')) return deny(session, 'crm:assign', null, 403);
    const health = await whatsapp.healthCheck();
    return NextResponse.json({
      app,
      status: health.ok ? 'connected' : health.status,
      reason: health.reason || null,
    });
  }

  if (!can(session, 'dashboard:view', app)) return deny(session, 'dashboard:view', app, 403);

  await hydrateConnectorEnv([app]);

  const connector = getConnector(app);
  if (!connector) return NextResponse.json({ error: 'unknown application' }, { status: 404 });

  return NextResponse.json({
    app,
    status: await connectorStatus(app),
    syncState: await getSyncState(app),
    records: await allRecords(app),
    breaker: breakerOpen(app),
  });
}

/** POST — test / sync / enable / disable / write. CSRF-protected. */
export async function POST(req, { params }) {
  const app = params.app;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { /* empty body is allowed */ }
  const action = String(body.action || 'test');

  // Each action maps to an explicit permission — deny by default.
  const ACTION_PERM = {
    test: 'dashboard:view',
    sync: 'apps:manage',
    enable: 'apps:manage',
    disable: 'apps:manage',
    write: 'products:write',
  };
  const perm = ACTION_PERM[action];
  if (!perm) return NextResponse.json({ error: `unknown action '${action}'` }, { status: 400 });

  if (app === 'whatsapp') {
    if (!can(session, perm)) return deny(session, perm, null, 403);
    if (action !== 'test' && action !== 'write') {
      return NextResponse.json({ error: 'unsupported action for WhatsApp' }, { status: 400 });
    }
    if (action === 'test') {
      const health = await whatsapp.healthCheck();
      await audit({ action: 'connector.test', actor: session.email, target: app, result: health.ok ? 'success' : 'failure', reason: health.reason });
      return NextResponse.json({ ok: health.ok, ...health });
    }
    const { to, message } = body;
    if (!to || !message) return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    try {
      const sent = await whatsapp.sendText(to, message);
      await audit({ action: 'whatsapp.send', actor: session.email, target: to, result: 'success' });
      return NextResponse.json({ ok: true, sent });
    } catch (e) {
      await audit({ action: 'whatsapp.send', actor: session.email, target: to, result: 'failure', reason: e.message });
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  if (!can(session, perm, app)) return deny(session, perm, app, 403);

  await hydrateConnectorEnv([app]);

  const connector = getConnector(app);
  if (!connector) return NextResponse.json({ error: 'unknown application' }, { status: 404 });

  if (action === 'test') {
    const health = await connector.healthCheck();
    await audit({ action: 'connector.test', actor: session.email, target: app, result: health.ok ? 'success' : 'failure', reason: health.reason || null });
    return NextResponse.json({ ok: health.ok, ...health });
  }

  if (action === 'sync') {
    const result = await connector.sync();
    await audit({ action: 'connector.sync', actor: session.email, target: app, result: result.ok ? 'success' : 'failure', detail: result.summary || null, reason: result.reason || null });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (action === 'enable' || action === 'disable') {
    // An app with no credentials cannot be "enabled" — it would be a lie.
    if (!connector.configured) {
      return NextResponse.json(
        { error: `Cannot enable an unconfigured application. Missing: ${connector.missingVars.join(', ')}` },
        { status: 409 }
      );
    }
    await audit({ action: `connector.${action}`, actor: session.email, target: app, result: 'success' });
    return NextResponse.json({ ok: true, status: await connectorStatus(app) });
  }

  if (action === 'write') {
    const { resource, payload } = body;
    if (!resource || !payload) return NextResponse.json({ error: 'resource and payload are required' }, { status: 400 });
    try {
      const out = await connector.write(resource, payload);
      await audit({ action: `connector.write:${resource}`, actor: session.email, target: app, result: 'success' });
      return NextResponse.json({ ok: true, out });
    } catch (e) {
      await audit({ action: `connector.write:${resource}`, actor: session.email, target: app, result: 'failure', reason: e.message });
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'unreachable' }, { status: 400 });
}
