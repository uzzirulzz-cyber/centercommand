// ============================================================
// /api/admin/search — universal search across records, applications and
// navigation. Server-side, permission-filtered, so a role never sees a hit in a
// module it cannot open.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can } from '../../../../lib/rbac';
import { queryRecords } from '../../../../lib/records';
import { DATA_MODULES, ALL_NAV_ITEMS } from '../../../../lib/modules';
import { APPS } from '../../../../lib/apps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] });

  const results = [];

  for (const item of ALL_NAV_ITEMS) {
    if (!can(session, item.perm)) continue;
    if (item.label.toLowerCase().includes(q.toLowerCase()) || item.href.includes(q.toLowerCase())) {
      results.push({ kind: 'page', title: item.label, meta: item.section, href: item.href, icon: item.icon });
    }
  }

  for (const app of APPS) {
    if (!app.name.toLowerCase().includes(q.toLowerCase())) continue;
    results.push({ kind: 'app', title: app.name, meta: app.domain, href: `/admin/apps/${app.slug}`, icon: 'bi-plug' });
  }

  // Record search is capped and permission-gated per module.
  for (const [slug, mod] of Object.entries(DATA_MODULES)) {
    if (!can(session, mod.perm)) continue;
    if (results.length >= 24) break;
    try {
      const { rows } = await queryRecords({ apps: mod.apps, search: q, perPage: 3, maxPerPage: 5 });
      for (const row of rows) {
        const label = row.orderNo || row.name || row.title || row.subject || row.sku || row.sourceId;
        results.push({
          kind: 'record',
          title: String(label),
          meta: `${mod.title} · ${row.app}`,
          href: mod.perm === 'dashboard:view' ? `/admin/${slug === 'crm' ? 'crm' : slug}` : '/admin',
          icon: mod.icon,
          sourceId: row.sourceId,
        });
      }
    } catch {
      // A module whose store is unreachable simply contributes no hits.
    }
  }

  return NextResponse.json({ ok: true, results: results.slice(0, 30), query: q });
}
