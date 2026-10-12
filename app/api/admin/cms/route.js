// ============================================================
// /api/admin/cms — storefront content, navigation, home sections and SEO
// metadata, persisted through the keyed config store.
//
// DRAFT/PUBLISH: the storefront-facing read (/api/cms/published, public) only
// ever returns the PUBLISHED document. Editors work on a draft and publish
// explicitly — the same rule the Theme Studio follows, so an unfinished edit can
// never appear on the live storefront.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { getConfig, setConfig, CONFIG_KEYS } from '../../../../lib/config';
import { DEFAULT_CMS_DOCUMENT, normalizeCmsDocument, normalizeSections } from '../../../../lib/cms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_VERSIONS = 20;
const MAX_SECTIONS = 40;

async function load() {
  const cfg = (await getConfig(CONFIG_KEYS.cms, null)) || {};
  return {
    published: cfg.published || { document: DEFAULT_CMS_DOCUMENT, version: 1, updatedAt: null, updatedBy: 'system' },
    draft: cfg.draft || null,
    versions: Array.isArray(cfg.versions) ? cfg.versions : [],
  };
}

function shape(state) {
  const pub = state.published;
  return {
    ok: true,
    published: { document: pub.document, version: pub.version || 1, updatedAt: pub.updatedAt || null, updatedBy: pub.updatedBy || null },
    draft: state.draft ? { document: state.draft.document, updatedAt: state.draft.updatedAt, updatedBy: state.draft.updatedBy } : null,
    versions: state.versions.map((v) => ({ id: v.id, label: v.label, at: v.at, by: v.by })),
  };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'cms:write')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'cms:write') }, { status: 403 });
  }
  const state = await load();
  return NextResponse.json({
    ...shape(state),
    defaults: DEFAULT_CMS_DOCUMENT,
    permissions: { write: can(session, 'cms:write'), publish: can(session, 'pagebuilder:write') },
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const action = String(body.action || '');
  const requiresPublish = action === 'publish' || action === 'restore' || action === 'restore-default';
  const required = requiresPublish ? 'pagebuilder:write' : 'cms:write';

  if (!can(session, required)) {
    await audit({ action: 'authz.denied', actor: session.email, target: `cms.${action}`, result: 'denied', reason: denyReason(session, required) });
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, required) }, { status: 403 });
  }

  const state = await load();
  const now = new Date().toISOString();
  const actor = session.email;

  try {
    switch (action) {
      case 'save-draft': {
        const document = normalizeCmsDocument(body.document);
        document.sections = normalizeSections(document.sections).slice(0, MAX_SECTIONS);
        const next = { ...state, draft: { document, updatedAt: now, updatedBy: actor } };
        await setConfig(CONFIG_KEYS.cms, next, actor);
        await audit({ action: 'cms.draft.saved', actor, target: `${document.sections.length} section(s)`, result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Draft saved — the storefront still serves the published version.' });
      }

      case 'publish': {
        const document = normalizeCmsDocument(body.document || state.draft?.document);
        document.sections = normalizeSections(document.sections).slice(0, MAX_SECTIONS);
        const version = {
          id: `cms-${Date.now().toString(36)}`,
          label: body.label || `Publish ${document.sections.length} section(s)`,
          at: now,
          by: actor,
          document,
        };
        const next = {
          ...state,
          published: { document, version: (state.published.version || 1) + 1, updatedAt: now, updatedBy: actor },
          draft: null,
          versions: [version, ...state.versions].slice(0, MAX_VERSIONS),
        };
        await setConfig(CONFIG_KEYS.cms, next, actor);
        await audit({ action: 'cms.published', actor, target: version.label, result: 'success', reason: `version ${next.published.version}` });
        return NextResponse.json({ ...shape(next), message: `Published as version ${next.published.version}.` });
      }

      case 'discard-draft': {
        const next = { ...state, draft: null };
        await setConfig(CONFIG_KEYS.cms, next, actor);
        await audit({ action: 'cms.draft.discarded', actor, target: 'draft', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Draft discarded.' });
      }

      case 'restore': {
        const hit = state.versions.find((v) => v.id === body.versionId);
        if (!hit) return NextResponse.json({ error: 'version not found' }, { status: 404 });
        const next = {
          ...state,
          published: { document: hit.document, version: (state.published.version || 1) + 1, updatedAt: now, updatedBy: actor },
          draft: null,
        };
        await setConfig(CONFIG_KEYS.cms, next, actor);
        await audit({ action: 'cms.version_restored', actor, target: hit.label, result: 'success' });
        return NextResponse.json({ ...shape(next), message: `Restored “${hit.label}”.` });
      }

      case 'restore-default': {
        const next = {
          ...state,
          published: { document: DEFAULT_CMS_DOCUMENT, version: (state.published.version || 1) + 1, updatedAt: now, updatedBy: actor },
          draft: null,
        };
        await setConfig(CONFIG_KEYS.cms, next, actor);
        await audit({ action: 'cms.restored_default', actor, target: 'default content', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Default content restored.' });
      }

      default:
        return NextResponse.json({ error: `unknown action '${action}'` }, { status: 400 });
    }
  } catch (error) {
    await audit({ action: `cms.${action}`, actor, target: 'cms', result: 'failure', reason: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
