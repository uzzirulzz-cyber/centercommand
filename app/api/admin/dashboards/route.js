
// Dashboard section + theme-layout preference. Persisted in the keyed config
// store and verified by read-back; the four embedded sections read their numbers
// from the EXISTING endpoints, so nothing is duplicated or invented here.
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { LAYOUTS, LAYOUT_IDS, DEFAULT_LAYOUT_ID } from '../../../../lib/theme/layouts';
import { guard, json, bodyOf } from '../../../../lib/adminRoute';

const KEY = 'admin.dashboards';
const SECTIONS = ['superieur', 'proui', 'rixzo', 'analytics', 'currency', 'executive', 'breeze', 'stellar', 'starpro'];
async function state() { return (await getConfig(KEY)) || { section: 'superieur', layout: 'superieur-dark' }; }

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const s = await state();
  return json({
    ok: true, configured: true, status: 'connected',
    section: SECTIONS.includes(s.section) ? s.section : 'superieur',
    layout: LAYOUT_IDS.includes(s.layout) ? s.layout : DEFAULT_LAYOUT_ID,
    sections: SECTIONS, layouts: LAYOUTS,
    rows: LAYOUTS.map((l) => ({ id: l.id, label: l.label, family: l.family, nav: l.nav, mode: l.mode, note: l.note })),
    items: [
      { label: 'sections embedded', detail: SECTIONS.join(', ') },
      { label: 'layouts available', detail: LAYOUTS.length },
      { label: 'data source', detail: 'existing /api/admin/overview, /analytics, /finance and /records/* — no duplicated metrics' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'dashboard:view', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const cur = await state();
  const next = { section: cur.section, layout: cur.layout };
  if (body.section !== undefined) {
    if (!SECTIONS.includes(body.section)) return json({ error: `unknown section '${body.section}'` }, 400);
    next.section = body.section;
  }
  if (body.layout !== undefined) {
    if (!LAYOUT_IDS.includes(body.layout)) return json({ error: `unknown layout '${body.layout}'` }, 400);
    next.layout = body.layout;
  }
  await setConfig(KEY, next);
  const back = await state();
  const persisted = back.section === next.section && back.layout === next.layout;
  await audit({ action: 'dashboards.prefs', actor: session.email, target: KEY, result: persisted ? 'success' : 'failure' });
  if (!persisted) return json({ error: 'value was not persisted by the store' }, 500);
  return json({ ok: true, section: back.section, layout: back.layout, message: `Dashboard set to ${back.section} · layout ${back.layout}.` });
}
