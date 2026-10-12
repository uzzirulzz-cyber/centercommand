import { getSession } from '../../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../../lib/rbac';
import { csrfValid } from '../../../../../lib/auth/guard';
import { audit } from '../../../../../lib/audit';
import { upsertRecords } from '../../../../../lib/store';
import { loadMetaToken, metaGet } from '../../../../../lib/connectors/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fieldMap(fieldData = []) {
  return Object.fromEntries((fieldData || []).map((field) => [String(field.name || '').toLowerCase(), (field.values || []).join(', ')]));
}

export async function POST(req) {
  const session = await getSession({ touch: true });
  if (!session) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return Response.json({ error: 'invalid csrf token' }, { status: 403 });
  if (!can(session, 'crm:assign') && !can(session, 'apps:manage')) {
    await audit({ action: 'authz.denied', actor: session.email, target: 'meta.leads.sync', result: 'denied', reason: denyReason(session, 'crm:assign') });
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = await loadMetaToken().catch(() => null);
  if (!token?.accessToken || (token.expiresAt && Date.parse(token.expiresAt) <= Date.now())) {
    return Response.json({ error: 'Meta is not connected or the access token has expired.' }, { status: 409 });
  }
  if (!token.scopes?.includes('leads_retrieval')) {
    return Response.json({ error: 'Meta did not grant leads_retrieval. Review the app access in Meta and reconnect.' }, { status: 403 });
  }

  const pages = (token.assets?.pages || []).filter((page) => page.id && page.accessToken);
  const synced = [];
  const errors = [];
  for (const page of pages) {
    try {
      const forms = await metaGet(page.accessToken, `${page.id}/leadgen_forms?fields=id,name,status&limit=50`);
      for (const form of forms.data || []) {
        try {
          const leads = await metaGet(page.accessToken, `${form.id}/leads?fields=id,created_time,field_data,ad_id,form_id&limit=100`);
          for (const lead of leads.data || []) {
            const fields = fieldMap(lead.field_data);
            const name = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(' ') || 'Facebook lead';
            synced.push({
              sourceId: String(lead.id),
              name: name.slice(0, 160),
              email: String(fields.email || '').slice(0, 180),
              phone: String(fields.phone_number || fields.phone || '').slice(0, 60),
              stage: 'New',
              owner: 'Unassigned',
              channel: 'Facebook Lead Ad',
              form: String(form.name || '').slice(0, 160),
              formId: String(lead.form_id || form.id),
              page: String(page.name || '').slice(0, 160),
              pageId: String(page.id),
              adId: lead.ad_id ? String(lead.ad_id) : null,
              lastTouch: lead.created_time || null,
              createdAt: lead.created_time || null,
              provider: 'Meta Lead Ads',
            });
          }
        } catch (error) { errors.push(`${page.name}/${form.name}: ${String(error.message).slice(0, 140)}`); }
      }
    } catch (error) { errors.push(`${page.name}: ${String(error.message).slice(0, 140)}`); }
  }

  const result = synced.length ? await upsertRecords('meta', synced) : { inserted: 0, updated: 0, rejected: 0, stored: 0 };
  await audit({ action: 'meta.leads.sync', actor: session.email, target: `${pages.length} page(s)`, result: errors.length ? 'partial' : 'success', detail: { ...result, errors: errors.length } });
  return Response.json({ ok: true, ...result, pages: pages.length, errors, message: errors.length ? 'Sync completed with some page/form errors.' : 'Facebook leads synced from Meta.' });
}
