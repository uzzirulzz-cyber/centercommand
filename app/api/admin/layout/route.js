// ============================================================
// /api/admin/layout — dashboard widget layouts and sidebar arrangement.
//
// Personal layouts belong to one admin; the organisation default is what a new
// admin starts from. Super Admins manage the org default; everyone else manages
// only their own. Layouts hold widget ids, order, size and visibility — never
// business data.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { getConfig, setConfig, CONFIG_KEYS } from '../../../../lib/config';
import { WIDGETS, WIDGET_IDS, DEFAULT_DASHBOARD_LAYOUT, normalizeLayout } from '../../../../lib/widgets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function load() {
  const cfg = (await getConfig(CONFIG_KEYS.layout, null)) || {};
  return {
    org: cfg.org || null,
    users: cfg.users && typeof cfg.users === 'object' ? cfg.users : {},
    sidebar: cfg.sidebar && typeof cfg.sidebar === 'object' ? cfg.sidebar : {},
  };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }
  const state = await load();
  const personal = state.users[session.email] || null;
  return NextResponse.json({
    ok: true,
    widgets: WIDGETS.map((w) => ({ id: w.id, title: w.title, group: w.group, description: w.description, sizes: w.sizes, permission: w.permission })),
    widgetIds: WIDGET_IDS,
    defaultLayout: DEFAULT_DASHBOARD_LAYOUT,
    personal: personal || null,
    org: state.org || null,
    sidebar: state.sidebar?.[session.email] || null,
    perms: { org: can(session, 'settings:manage') },
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const action = String(body.action || 'save-personal');
  const state = await load();

  if (action === 'save-personal') {
    if (!can(session, 'dashboard:view')) {
      return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
    }
    const layout = normalizeLayout(body.layout);
    const next = { ...state, users: { ...state.users, [session.email]: layout } };
    await setConfig(CONFIG_KEYS.layout, next, session.email);
    await audit({ action: 'layout.saved', actor: session.email, target: 'personal dashboard', result: 'success', detail: { widgets: layout.widgets.length } });
    return NextResponse.json({ ok: true, personal: layout, message: 'Your layout was saved.' });
  }

  if (action === 'save-org') {
    if (!can(session, 'settings:manage')) {
      await audit({ action: 'authz.denied', actor: session.email, target: 'layout.save-org', result: 'denied' });
      return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'settings:manage') }, { status: 403 });
    }
    const layout = normalizeLayout(body.layout || state.users[session.email]);
    const next = { ...state, org: layout };
    await setConfig(CONFIG_KEYS.layout, next, session.email);
    await audit({ action: 'layout.org_saved', actor: session.email, target: 'organisation dashboard default', result: 'success' });
    return NextResponse.json({ ok: true, org: layout, message: 'Organisation default updated.' });
  }

  if (action === 'save-sidebar') {
    if (!can(session, 'dashboard:view')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const sidebar = {
      order: Array.isArray(body.order) ? body.order.slice(0, 80).map(String) : [],
      hidden: Array.isArray(body.hidden) ? body.hidden.slice(0, 80).map(String) : [],
      pinned: Array.isArray(body.pinned) ? body.pinned.slice(0, 20).map(String) : [],
      savedAt: new Date().toISOString(),
    };
    const next = { ...state, sidebar: { ...state.sidebar, [session.email]: sidebar } };
    await setConfig(CONFIG_KEYS.layout, next, session.email);
    await audit({ action: 'layout.sidebar_saved', actor: session.email, target: 'sidebar arrangement', result: 'success' });
    return NextResponse.json({ ok: true, sidebar, message: 'Sidebar arrangement saved.' });
  }

  if (action === 'reset-personal') {
    const users = { ...state.users };
    delete users[session.email];
    const next = { ...state, users };
    await setConfig(CONFIG_KEYS.layout, next, session.email);
    await audit({ action: 'layout.reset', actor: session.email, target: 'personal dashboard', result: 'success' });
    return NextResponse.json({ ok: true, personal: null, message: 'Reset to the default layout.' });
  }

  return NextResponse.json({ error: `unknown action '${action}'` }, { status: 400 });
}
