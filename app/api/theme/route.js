// ============================================================
// Public theme endpoint — cosmetics only.
//
// The admin shell and the login screen need the PUBLISHED theme before the
// session exists (the sign-in page is unauthenticated by design). This endpoint
// therefore returns visual tokens and branding only:
//   • no credentials, no env values, no session data
//   • no drafts (a half-finished experiment must never leak to the storefront)
//   • no version history
// Anything that must not be public stays in /api/admin/theme, which requires an
// authenticated session.
// ============================================================
import { NextResponse } from 'next/server';
import { getConfig, CONFIG_KEYS } from '../../../lib/config';
import { DEFAULT_TOKENS } from '../../../lib/theme/schema';
import { tokensToVars, resolvedMode, customCssBlock } from '../../../lib/theme/css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = (await getConfig(CONFIG_KEYS.theme, null)) || null;
  const published = cfg?.published?.tokens || DEFAULT_TOKENS;
  const mode = resolvedMode(published);

  return NextResponse.json(
    {
      themeName: published?.meta?.name || DEFAULT_TOKENS.meta.name,
      presetId: published?.meta?.presetId || DEFAULT_TOKENS.meta.presetId,
      mode,
      // The client provider rebuilds the editable token set from this; without
      // it the shell silently fell back to the default palette. Cosmetics only —
      // no drafts, credentials or session data are ever included.
      tokens: published,
      vars: tokensToVars(published),
      css: customCssBlock(published?.custom?.css || ''),
      branding: published?.branding || DEFAULT_TOKENS.branding,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
