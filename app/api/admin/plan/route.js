// ============================================================
// /api/admin/plan
//
// Server-authoritative subscription tier for the admin. Stored under
// `plan:tier` in the config store; tiers are `starter | pro | vip`.
// Only `plan:manage` (Super Admin by default) may write — every admin can read.
// A read returns the active tier plus the feature list so the UI does not
// duplicate the truth.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { csrfValid } from '../../../../lib/auth/guard';
import { can, denyReason } from '../../../../lib/rbac';
import { getAdminConfig, setAdminConfig } from '../../../../lib/admin-config';
import { audit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIERS = {
  starter: {
    label: 'Starter',
    price: 0,
    color: '#8893aa',
    features: ['Dashboard overview', 'App health badges', 'Theme Studio (drafts)'],
  },
  pro: {
    label: 'Pro',
    price: 49,
    color: '#4c8dff',
    features: ['Everything in Starter', 'Custom business automation', 'CMS + page builder', 'Priority connectors'],
  },
  vip: {
    label: 'VIP',
    price: 149,
    color: '#7c5cff',
    features: ['Everything in Pro', 'Dedicated success manager', 'Betting-disabled MagXTV modes', 'Beta module preview'],
  },
};

function normalize(t) { return TIERS[t] ? t : 'starter'; }

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }
  const active = normalize(await getAdminConfig('plan:tier', 'starter'));
  return NextResponse.json({ ok: true, active, tiers: TIERS, current: TIERS[active] });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });
  if (!can(session, 'plan:manage')) {
    await audit({ action: 'plan.change', actor: session.email, target: 'tier', result: 'denied' });
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'plan:manage') }, { status: 403 });
  }
  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'valid JSON required' }, { status: 400 }); }
  const next = normalize(String(body.tier || ''));
  if (typeof body.tier !== 'string' || !TIERS[body.tier]) {
    return NextResponse.json({ error: 'tier must be starter, pro, or vip' }, { status: 400 });
  }
  await setAdminConfig('plan:tier', next);
  await audit({ action: 'plan.change', actor: session.email, target: next, result: 'success' });
  return NextResponse.json({ ok: true, active: next, current: TIERS[next] });
}
