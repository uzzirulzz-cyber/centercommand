
// Audit log reader over the existing audit trail (lib/audit.js readAudit).
import { audit, readAudit } from '../../../../lib/audit';
import { bodyOf, guard, json } from '../../../../lib/adminRoute';

export async function GET(req) {
  const { session, error } = await guard(req, 'audit:view');
  if (error) return error;
  const u = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(u.searchParams.get('limit') || 100)));
  const actorFilter = (u.searchParams.get('actor') || '').toLowerCase();
  const actionFilter = (u.searchParams.get('action') || '').toLowerCase();

  let events = [];
  try { events = await readAudit(limit); } catch { events = []; }
  const rows = (Array.isArray(events) ? events : [])
    .map((e, i) => ({
      id: e.id || `ev_${i}`,
      at: e.at || e.time || e.createdAt || null,
      actor: e.actor || e.email || 'unknown',
      action: e.action || '',
      target: e.target || '',
      result: e.result || '',
      detail: e.detail ? JSON.stringify(e.detail).slice(0, 120) : '',
    }))
    .filter((r) => (!actorFilter || String(r.actor).toLowerCase().includes(actorFilter)))
    .filter((r) => (!actionFilter || String(r.action).toLowerCase().includes(actionFilter)));

  return json({
    ok: true, configured: true, status: 'connected', rows,
    items: [
      { label: 'events returned', detail: rows.length },
      { label: 'source', detail: 'server-side audit trail written by every admin action' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'dashboard:view', { csrf: true });
  if (error) return error;

  const body = await bodyOf(req);
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return json({ error: 'A non-empty error message is required.' }, 400);
  }

  await audit({
    action: 'client.error',
    actor: session.email,
    target: 'app.global_error',
    result: 'failure',
    detail: {
      message: body.message.slice(0, 500),
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 1000) : null,
    },
  });
  return json({ ok: true }, 201);
}
