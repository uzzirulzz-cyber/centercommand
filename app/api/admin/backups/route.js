
// Restore points. These are ADMIN-SIDE markers persisted in the config store:
// creating one records intent and metadata. It is NOT a database dump, and the
// route says so instead of pretending a restore happened.
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf } from '../../../../lib/adminRoute';

const KEY = 'ops.backups';

async function state() { return (await getConfig(KEY)) || { points: [] }; }

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const s = await state();
  const points = Array.isArray(s.points) ? s.points : [];
  return json({
    ok: true, configured: true, status: 'connected',
    rows: points.map((p) => ({ id: p.id, label: p.label, createdBy: p.createdBy, createdAt: p.createdAt, kind: p.kind, note: p.note })),
    items: [
      { label: 'restore points held', detail: points.length },
      { label: 'scope', detail: 'admin-side markers in the config store — not database dumps' },
      { label: 'database restore', detail: 'must be executed by the deployment operator (npm run db:migrate / provider snapshot)' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'ops:manage', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || 'create');
  const s = await state();
  const points = Array.isArray(s.points) ? s.points.slice() : [];

  if (action === 'create') {
    const point = {
      id: `rp_${Date.now().toString(36)}`,
      label: String(body.label || 'Restore point').slice(0, 80),
      note: String(body.note || '').slice(0, 240),
      kind: 'admin-marker',
      createdBy: session.email,
      createdAt: new Date().toISOString(),
    };
    points.unshift(point);
    await setConfig(KEY, { points: points.slice(0, 50) });
    const back = await state();
    const persisted = (back.points || []).some((p) => p.id === point.id);
    await audit({ action: 'ops.backup.create', actor: session.email, target: point.id, result: persisted ? 'success' : 'failure' });
    if (!persisted) return json({ error: 'restore point was not persisted by the store' }, 500);
    return json({ ok: true, message: `Restore point "${point.label}" recorded (${point.id}). A database snapshot still has to be taken by your deployment provider.` });
  }

  if (action === 'delete') {
    const id = String(body.id || '');
    const next = points.filter((p) => p.id !== id);
    if (next.length === points.length) return json({ error: 'restore point not found' }, 404);
    await setConfig(KEY, { points: next });
    await audit({ action: 'ops.backup.delete', actor: session.email, target: id, result: 'success' });
    return json({ ok: true, message: `Restore point ${id} removed.` });
  }

  if (action === 'restore') {
    const id = String(body.id || '');
    const hit = points.find((p) => p.id === id);
    if (!hit) return json({ error: 'restore point not found' }, 404);
    await audit({ action: 'ops.backup.restore.requested', actor: session.email, target: id, result: 'success' });
    return json({
      ok: true,
      message: `Restore of "${hit.label}" recorded as a request. The admin does not overwrite your database: run the provider snapshot restore, then verify with System Health.`,
    });
  }

  return json({ error: `unknown action '${action}'` }, 400);
}
