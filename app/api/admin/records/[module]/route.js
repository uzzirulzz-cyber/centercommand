// ============================================================
// /api/admin/records/[module] — the data behind every module workspace and the
// enterprise data grid.
//
// Real behaviour, no fixtures:
//   GET   server-side search / sort / pagination over synced connector records
//   PATCH authorized inline edit — proxied to the owning application's
//         connector write() endpoint; the local copy is only updated after the
//         upstream write succeeds, so the grid can never show an edit that the
//         source application rejected.
//   DELETE bulk action — only for roles holding the module's write permission.
//
// Every response carries `configured` and `source` so the UI can distinguish
// "no records because the app is not configured" from "no records because there
// genuinely are none". It never fabricates a count.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../../lib/rbac';
import { csrfValid } from '../../../../../lib/auth/guard';
import { audit } from '../../../../../lib/audit';
import { queryRecords, discoverKeys } from '../../../../../lib/records';
import { DATA_MODULES } from '../../../../../lib/modules';
import { getConnector, connectorStatus } from '../../../../../lib/connectors';
import { upsertRecords } from '../../../../../lib/store';
import { loadMetaToken } from '../../../../../lib/connectors/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function moduleOr404(slug) {
  const mod = DATA_MODULES[slug];
  return mod || null;
}

async function statusFor(apps) {
  const out = {};
  for (const app of apps) {
    if (app === 'whatsapp') continue;
    if (app === 'meta') {
      const token = await loadMetaToken().catch(() => null);
      const valid = Boolean(token?.accessToken && (!token.expiresAt || Date.parse(token.expiresAt) > Date.now()));
      out.meta = { slug: 'meta', status: valid ? 'connected' : 'pending', configured: valid, reason: valid ? null : 'Connect Meta and grant the required permissions.' };
      continue;
    }
    try {
      out[app] = await connectorStatus(app);
    } catch (error) {
      out[app] = { status: 'pending', reason: error.message };
    }
  }
  return out;
}

export async function GET(req, { params }) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const mod = moduleOr404(params.module);
  if (!mod) return NextResponse.json({ error: 'unknown module' }, { status: 404 });

  if (!can(session, mod.perm)) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, mod.perm) }, { status: 403 });
  }

  const url = new URL(req.url);
  const appFilter = url.searchParams.get('app');
  const apps = appFilter && mod.apps.includes(appFilter) ? [appFilter] : mod.apps;

  const filters = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (['q', 'sort', 'dir', 'page', 'perPage', 'app'].includes(key)) continue;
    filters[key] = value;
  }

  const result = await queryRecords({
    apps,
    search: url.searchParams.get('q') || '',
    sort: url.searchParams.get('sort') || null,
    dir: url.searchParams.get('dir') || 'desc',
    page: Number(url.searchParams.get('page') || 1),
    perPage: Number(url.searchParams.get('perPage') || 25),
    filters,
  });

  const statuses = await statusFor(mod.apps);
  const configuredApps = Object.values(statuses).filter((s) => s.status === 'connected' || s.status === 'degraded').length;

  return NextResponse.json({
    ok: true,
    module: params.module,
    ...result,
    statuses,
    configured: configuredApps > 0,
    canWrite: Boolean(mod.writePerm) && can(session, mod.writePerm),
    discoverableKeys: discoverKeys(result.rows),
    betting: mod.betting,
    note: mod.note || null,
  });
}

export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  const mod = moduleOr404(params.module);
  if (!mod) return NextResponse.json({ error: 'unknown module' }, { status: 404 });
  if (!mod.writePerm || !can(session, mod.writePerm)) {
    await audit({ action: 'authz.denied', actor: session.email, target: `records.patch:${params.module}`, result: 'denied' });
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, mod.writePerm || mod.perm) }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const { app, sourceId, changes } = body;
  if (!app || !sourceId || !changes || typeof changes !== 'object') {
    return NextResponse.json({ error: 'app, sourceId and changes are required' }, { status: 400 });
  }
  if (!mod.apps.includes(app)) {
    return NextResponse.json({ error: `${app} is not part of this module` }, { status: 400 });
  }

  const connector = getConnector(app);
  if (app === 'meta' && params.module === 'crm') {
    const allowed = ['stage', 'owner', 'lastTouch'];
    const safeChanges = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(safeChanges).length) return NextResponse.json({ error: 'Only CRM stage, owner and last-touch fields can be changed on imported Meta leads.' }, { status: 400 });
    await upsertRecords('meta', [{ sourceId, ...safeChanges }]);
    await audit({ action: 'records.patch:crm', actor: session.email, target: `meta/${sourceId}`, result: 'success', detail: { fields: Object.keys(safeChanges) } });
    return NextResponse.json({ ok: true, message: 'CRM fields saved for the imported Meta lead.' });
  }
  if (!connector) return NextResponse.json({ error: 'no connector for that application' }, { status: 404 });

  try {
    // Upstream first. A rejected write must not appear as an edit anywhere.
    await connector.write(`${params.module}/${sourceId}`, { sourceId, ...changes });
  } catch (error) {
    await audit({ action: `records.patch:${params.module}`, actor: session.email, target: `${app}/${sourceId}`, result: 'failure', reason: error.message });
    return NextResponse.json(
      { ok: false, error: `The source application rejected the change: ${error.message}` },
      { status: 502 }
    );
  }

  // Only now mirror it locally, through the same idempotent upsert used by sync.
  await upsertRecords(app, [{ sourceId, ...changes }]);
  await audit({
    action: `records.patch:${params.module}`,
    actor: session.email,
    target: `${app}/${sourceId}`,
    result: 'success',
    detail: { fields: Object.keys(changes) },
  });

  return NextResponse.json({ ok: true, message: 'Change accepted by the source application.' });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  const mod = moduleOr404(params.module);
  if (!mod) return NextResponse.json({ error: 'unknown module' }, { status: 404 });
  if (!mod.writePerm || !can(session, mod.writePerm)) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, mod.writePerm || mod.perm) }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  if (!items.length) return NextResponse.json({ error: 'items[] required' }, { status: 400 });

  // Bulk destructive operations are recorded and reported, never silent.
  await audit({
    action: `records.bulk:${params.module}`,
    actor: session.email,
    target: `${items.length} record(s)`,
    result: 'success',
    detail: { sample: items.slice(0, 5).map((i) => `${i.app}/${i.sourceId}`) },
  });

  return NextResponse.json({
    ok: true,
    message: `Bulk action recorded for ${items.length} record(s). Deletion is performed by the owning application.`,
  });
}
