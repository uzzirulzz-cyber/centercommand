// ============================================================
// /api/admin/theme — the Theme Studio backend (README §3, §4, §5 of the
// upgrade brief). Guarded by the existing session + RBAC + CSRF stack.
//
// Model:
//   published  the theme every admin sees. Changed ONLY by an explicit publish.
//   draft      an experiment. Never visible to anyone but the author, never
//              applied to the login screen or the storefront.
//   versions   capped history of published themes, restorable.
//   customPresets  saved clones/variations.
//
// Permission split (lib/rbac.js):
//   theme:manage   save a draft, clone/rename presets, import
//   theme:publish  publish, revert, restore-default, restore a version
// A draft therefore cannot go live without a publish-capable role, and no
// action here ever publishes automatically.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { getConfig, setConfig, CONFIG_KEYS } from '../../../../lib/config';
import {
  DEFAULT_TOKENS,
  GROUPS,
  MODES,
  FONT_STACKS,
  sanitizeTokens,
  sanitizeCustomCss,
  contrastAudit,
  mergeTokens,
} from '../../../../lib/theme/schema';
import { PRESETS, presetTokens, DEFAULT_PRESET_ID } from '../../../../lib/theme/presets';
import { tokensToVars, resolvedMode } from '../../../../lib/theme/css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_VERSIONS = 20;
const MAX_CUSTOM_PRESETS = 24;

const VERSION_1 = { id: 'v1', label: 'PlayBeat Executive Midnight (initial)', at: '2026-01-01T00:00:00.000Z', by: 'system', presetId: DEFAULT_PRESET_ID, tokens: DEFAULT_TOKENS };

async function loadState() {
  const cfg = (await getConfig(CONFIG_KEYS.theme, null)) || {};
  return {
    published: cfg.published || {
      name: DEFAULT_TOKENS.meta.name,
      presetId: DEFAULT_PRESET_ID,
      tokens: DEFAULT_TOKENS,
      version: 1,
      updatedAt: VERSION_1.at,
      updatedBy: 'system',
    },
    draft: cfg.draft || null,
    versions: Array.isArray(cfg.versions) && cfg.versions.length ? cfg.versions : [VERSION_1],
    customPresets: Array.isArray(cfg.customPresets) ? cfg.customPresets : [],
  };
}

function shape(state) {
  const pub = state.published;
  return {
    ok: true,
    published: {
      name: pub.name || pub.tokens?.meta?.name,
      presetId: pub.presetId || pub.tokens?.meta?.presetId,
      version: pub.version || 1,
      updatedAt: pub.updatedAt || null,
      updatedBy: pub.updatedBy || null,
      tokens: pub.tokens,
      mode: resolvedMode(pub.tokens),
    },
    draft: state.draft
      ? { presetId: state.draft.presetId, updatedAt: state.draft.updatedAt, updatedBy: state.draft.updatedBy, tokens: state.draft.tokens }
      : null,
    versions: state.versions.map((v) => ({ id: v.id, label: v.label, at: v.at, by: v.by, presetId: v.presetId })),
    presets: [
      ...PRESETS.map((p) => ({ id: p.id, name: p.name, description: p.description, mode: p.mode, swatch: p.swatch, custom: false })),
      ...state.customPresets.map((p) => ({ id: p.id, name: p.name, description: p.description || 'Custom variation', mode: p.mode || 'dark', swatch: p.swatch || [], custom: true })),
    ],
    schema: { groups: GROUPS, fonts: FONT_STACKS, modes: MODES, defaults: DEFAULT_TOKENS },
    contrast: contrastAudit(state.draft?.tokens || state.published?.tokens),
  };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }
  const state = await loadState();
  return NextResponse.json({
    ...shape(state),
    permissions: {
      manage: can(session, 'theme:manage'),
      publish: can(session, 'theme:publish'),
    },
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const action = String(body.action || '');

  const needsPublish = new Set(['publish', 'restore-default', 'restore-version', 'revert']);
  const required = needsPublish.has(action) ? 'theme:publish' : 'theme:manage';

  if (!can(session, required)) {
    await audit({ action: 'authz.denied', actor: session.email, role: session.role, target: `theme.${action}`, result: 'denied', reason: denyReason(session, required) });
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, required) }, { status: 403 });
  }

  const state = await loadState();
  const actor = session.email;
  const now = new Date().toISOString();

  const guardTokens = (raw) => {
    const clean = sanitizeTokens(raw);
    clean.custom = { css: sanitizeCustomCss(clean.custom?.css || '') };
    return clean;
  };

  try {
    switch (action) {
      /* ---------------- draft ---------------- */
      case 'save-draft': {
        const tokens = guardTokens(body.tokens);
        const next = {
          ...state,
          draft: { tokens, presetId: body.presetId || tokens?.meta?.presetId || null, updatedAt: now, updatedBy: actor },
        };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.draft.saved', actor, target: tokens?.meta?.name || 'draft', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Draft saved — not published.' });
      }

      /* ---------------- publish ---------------- */
      case 'publish': {
        const tokens = guardTokens(body.tokens || state.draft?.tokens);
        if (!tokens) return NextResponse.json({ error: 'nothing to publish' }, { status: 400 });
        tokens.meta = { ...tokens.meta, presetId: body.presetId || tokens.meta?.presetId || state.draft?.presetId || null };
        const version = {
          id: `v${Date.now().toString(36)}`,
          label: body.label || tokens.meta?.name || 'Published theme',
          at: now,
          by: actor,
          presetId: tokens.meta.presetId,
          tokens,
        };
        const next = {
          ...state,
          published: {
            name: tokens.meta?.name || 'Custom theme',
            presetId: tokens.meta.presetId,
            tokens,
            version: (state.published.version || 1) + 1,
            updatedAt: now,
            updatedBy: actor,
          },
          draft: null,
          versions: [version, ...state.versions].slice(0, MAX_VERSIONS),
        };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.published', actor, target: version.label, result: 'success', reason: `version ${next.published.version}` });
        return NextResponse.json({ ...shape(next), message: `Published as version ${next.published.version}.` });
      }

      /* ---------------- revert the draft ---------------- */
      case 'revert': {
        const next = { ...state, draft: null };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.draft.discarded', actor, target: 'draft', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Draft discarded — back to the published theme.' });
      }

      /* ---------------- restore factory default ---------------- */
      case 'restore-default': {
        const tokens = presetTokens(DEFAULT_PRESET_ID);
        const version = { id: `v${Date.now().toString(36)}`, label: 'Restore: PlayBeat Executive Midnight', at: now, by: actor, presetId: DEFAULT_PRESET_ID, tokens };
        const next = {
          ...state,
          published: { name: tokens.meta.name, presetId: DEFAULT_PRESET_ID, tokens, version: (state.published.version || 1) + 1, updatedAt: now, updatedBy: actor },
          draft: null,
          versions: [version, ...state.versions].slice(0, MAX_VERSIONS),
        };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.restored_default', actor, target: 'Executive Midnight', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Default theme restored.' });
      }

      /* ---------------- restore a version ---------------- */
      case 'restore-version': {
        const hit = state.versions.find((v) => v.id === body.versionId);
        if (!hit) return NextResponse.json({ error: 'version not found' }, { status: 404 });
        const tokens = guardTokens(hit.tokens);
        const next = {
          ...state,
          published: { name: hit.label, presetId: hit.presetId, tokens, version: (state.published.version || 1) + 1, updatedAt: now, updatedBy: actor },
          draft: null,
        };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.version_restored', actor, target: hit.label, result: 'success' });
        return NextResponse.json({ ...shape(next), message: `Restored “${hit.label}”.` });
      }

      /* ---------------- custom presets ---------------- */
      case 'clone-preset': {
        const sourceId = body.presetId || state.published.presetId || DEFAULT_PRESET_ID;
        const base = presetTokens(sourceId, state.customPresets);
        const tokens = guardTokens(body.tokens || base);
        const name = String(body.name || `${tokens.meta?.name || 'Theme'} (copy)`).slice(0, 60);
        const id = `custom-${Date.now().toString(36)}`;
        tokens.meta = { ...tokens.meta, name, presetId: id };
        const custom = {
          id, name, description: body.description || 'Custom variation', mode: tokens.meta?.mode || 'dark',
          swatch: [tokens.colors?.bg, tokens.colors?.cardBg, tokens.colors?.accent, tokens.colors?.highlight].filter(Boolean),
          tokens,
        };
        const next = { ...state, customPresets: [custom, ...state.customPresets].slice(0, MAX_CUSTOM_PRESETS) };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.preset.cloned', actor, target: name, result: 'success', reason: `from ${sourceId}` });
        return NextResponse.json({ ...shape(next), message: `Saved “${name}” to your presets.` });
      }

      case 'rename-preset': {
        const id = String(body.presetId || '');
        const target = state.customPresets.find((p) => p.id === id);
        if (!target) return NextResponse.json({ error: 'only custom presets can be renamed' }, { status: 400 });
        const name = String(body.name || '').trim().slice(0, 60);
        if (!name) return NextResponse.json({ error: 'a name is required' }, { status: 400 });
        const next = {
          ...state,
          customPresets: state.customPresets.map((p) => (p.id === id ? { ...p, name } : p)),
        };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.preset.renamed', actor, target: `${target.name} → ${name}`, result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Preset renamed.' });
      }

      case 'delete-preset': {
        const id = String(body.presetId || '');
        const target = state.customPresets.find((p) => p.id === id);
        if (!target) return NextResponse.json({ error: 'preset not found' }, { status: 404 });
        const next = { ...state, customPresets: state.customPresets.filter((p) => p.id !== id) };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.preset.deleted', actor, target: target.name, result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Preset deleted.' });
      }

      /* ---------------- import ---------------- */
      case 'import': {
        let incoming = body.tokens;
        if (typeof body.json === 'string') {
          try { incoming = JSON.parse(body.json); } catch { return NextResponse.json({ error: 'that is not valid JSON' }, { status: 400 }); }
        }
        if (!incoming || typeof incoming !== 'object') return NextResponse.json({ error: 'no token object found' }, { status: 400 });
        const tokens = guardTokens(incoming.tokens || incoming);
        const next = { ...state, draft: { tokens, presetId: tokens.meta?.presetId || null, updatedAt: now, updatedBy: actor } };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.imported', actor, target: tokens.meta?.name || 'imported theme', result: 'success' });
        return NextResponse.json({ ...shape(next), message: 'Imported into the draft. Review, then publish.' });
      }

      /* ---------------- apply a built-in / custom preset to the draft ---------------- */
      case 'apply-preset': {
        const custom = state.customPresets.find((p) => p.id === body.presetId);
        const tokens = custom ? guardTokens(custom.tokens) : presetTokens(body.presetId, state.customPresets);
        const next = { ...state, draft: { tokens, presetId: body.presetId, updatedAt: now, updatedBy: actor } };
        await setConfig(CONFIG_KEYS.theme, next, actor);
        await audit({ action: 'theme.preset.applied', actor, target: body.presetId, result: 'success', reason: 'draft only — not published' });
        return NextResponse.json({ ...shape(next), message: `“${tokens.meta?.name || body.presetId}” loaded into the draft.` });
      }

      /* ---------------- accessibility check on an arbitrary draft ---------------- */
      case 'audit-contrast': {
        const tokens = mergeTokens(DEFAULT_TOKENS, body.tokens || {});
        return NextResponse.json({ ok: true, contrast: contrastAudit(tokens) });
      }

      default:
        return NextResponse.json({ error: `unknown action '${action}'` }, { status: 400 });
    }
  } catch (error) {
    await audit({ action: `theme.${action}`, actor, target: 'theme', result: 'failure', reason: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
