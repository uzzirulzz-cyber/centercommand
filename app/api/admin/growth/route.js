
// Growth placements: directory listings, verification steps and their honest state.
// Each record carries the real target URL and a status word — never a promise.
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf } from '../../../../lib/adminRoute';

const KEY = 'admin.growth';
const STATES = ['prepared', 'awaiting-terms', 'submitted', 'blocked', 'published', 'rejected'];
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

async function state() { return (await getConfig(KEY)) || { placements: [] }; }

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const s = await state();
  const placements = Array.isArray(s.placements) ? s.placements : [];
  return json({
    ok: true, configured: true, status: 'connected',
    rows: placements.map((p) => ({ id: p.id, name: p.name, url: p.url, state: p.state, note: p.note, updatedAt: p.updatedAt })),
    items: [
      { label: 'placements tracked', detail: placements.length },
      { label: 'allowed states', detail: STATES.join(', ') },
      { label: 'honesty rule', detail: 'a placement is only "published" when you verify the live page' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'growth:write', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || 'upsert');
  const s = await state();
  let placements = Array.isArray(s.placements) ? s.placements.slice() : [];

  if (action === 'remove') {
    const id = String(body.id || slug(body.name));
    const next = placements.filter((p) => p.id !== id);
    if (next.length === placements.length) return json({ error: 'placement not found' }, 404);
    await setConfig(KEY, { placements: next });
    await audit({ action: 'growth.remove', actor: session.email, target: id, result: 'success' });
    return json({ ok: true, message: 'Placement removed.' });
  }

  if (action === 'upsert') {
    const name = String(body.name || '').trim();
    if (!name) return json({ error: 'name is required' }, 400);
    const st = STATES.includes(body.state) ? body.state : 'prepared';
    const id = body.id || slug(name);
    const rec = { id, name: name.slice(0, 80), url: String(body.url || '').slice(0, 300), state: st, note: String(body.note || '').slice(0, 240), updatedAt: new Date().toISOString(), updatedBy: session.email };
    const idx = placements.findIndex((p) => p.id === id);
    if (idx >= 0) placements[idx] = { ...placements[idx], ...rec }; else placements = [rec, ...placements];
    await setConfig(KEY, { placements: placements.slice(0, 200) });
    const back = await state();
    const persisted = (back.placements || []).some((p) => p.id === id && p.state === st);
    await audit({ action: 'growth.upsert', actor: session.email, target: id, result: persisted ? 'success' : 'failure' });
    if (!persisted) return json({ error: 'placement was not persisted by the store' }, 500);
    return json({ ok: true, message: `"${name}" recorded as ${st}.` });
  }

  return json({ error: `unknown action '${action}'` }, 400);
}
