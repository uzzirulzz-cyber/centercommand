// ============================================================
// /api/admin/marketing — campaigns persisted through the keyed config store.
//
// HONESTY RULE: spend, reach, impressions, clicks and conversions are only ever
// populated from a real provider report. This endpoint stores the campaign
// plan and its configuration; metrics live in `metrics` and stay null until an
// integration (Meta, Google Ads, etc.) actually reports them. The UI renders
// "awaiting integration" for a null metric rather than a zero that looks real.
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { getConfig, setConfig, CONFIG_KEYS } from '../../../../lib/config';
import { whatsapp } from '../../../../lib/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CAMPAIGNS = 200;

const CHANNELS = ['WhatsApp', 'Facebook', 'Instagram', 'Email', 'Organic search', 'Direct', 'Referral', 'Paid search', 'Affiliate'];
const STATES = ['draft', 'scheduled', 'active', 'paused', 'completed'];

function normalizeCampaign(input = {}, index = 0) {
  const str = (v, max) => (v === undefined || v === null ? '' : String(v).slice(0, max));
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; // null = not reported
  };
  const metrics = input.metrics && typeof input.metrics === 'object' ? input.metrics : {};
  return {
    id: str(input.id, 40) || `cmp-${Date.now().toString(36)}-${index}`,
    name: str(input.name, 120) || 'Untitled campaign',
    channel: CHANNELS.includes(input.channel) ? input.channel : 'WhatsApp',
    state: STATES.includes(input.state) ? input.state : 'draft',
    objective: str(input.objective, 200),
    audience: str(input.audience, 200),
    landingHref: str(input.landingHref, 300),
    budgetPkr: money(input.budgetPkr),
    // Reported figures only. A null means "no provider has reported this yet".
    metrics: {
      spendPkr: money(metrics.spendPkr),
      reach: Number.isFinite(Number(metrics.reach)) ? Number(metrics.reach) : null,
      clicks: Number.isFinite(Number(metrics.clicks)) ? Number(metrics.clicks) : null,
      conversions: Number.isFinite(Number(metrics.conversions)) ? Number(metrics.conversions) : null,
      reportedAt: metrics.reportedAt ? str(metrics.reportedAt, 40) : null,
      provider: metrics.provider ? str(metrics.provider, 60) : null,
    },
    startAt: str(input.startAt, 40),
    endAt: str(input.endAt, 40),
    updatedAt: new Date().toISOString(),
  };
}

async function load() {
  const cfg = (await getConfig(CONFIG_KEYS.marketing, null)) || {};
  return { campaigns: Array.isArray(cfg.campaigns) ? cfg.campaigns : [] };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'marketing:write')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'marketing:write') }, { status: 403 });
  }
  const state = await load();

  const health = await whatsapp.healthCheck();
  const integrations = [
    { name: 'WhatsApp Business Cloud API', channel: 'WhatsApp', configured: whatsapp.configured, status: health.ok ? 'connected' : health.status || 'pending', reason: health.reason || null, capabilities: ['messaging'] },
    { name: 'Facebook / Messenger', channel: 'Facebook', configured: Boolean(process.env.META_FB_APP_SECRET && process.env.META_WABA_TOKEN), status: 'pending', reason: 'requires a Meta app with pages_messaging and a signed webhook', capabilities: ['messaging'] },
    { name: 'Instagram Messaging', channel: 'Instagram', configured: false, status: 'pending', reason: 'requires instagram_manage_messages on a professional account', capabilities: ['messaging'] },
    { name: 'Email (SMTP / provider)', channel: 'Email', configured: false, status: 'pending', reason: 'no email provider credential is configured', capabilities: [] },
  ];

  return NextResponse.json({
    ok: true,
    campaigns: state.campaigns,
    channels: CHANNELS,
    states: STATES,
    integrations,
    // Attribution requires a real analytics source; until then it is explicitly
    // unavailable rather than a plausible-looking number.
    attribution: { available: false, reason: 'No analytics provider is configured, so revenue attribution cannot be computed.' },
    permissions: { write: can(session, 'marketing:write') },
  });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });
  if (!can(session, 'marketing:write')) {
    await audit({ action: 'authz.denied', actor: session.email, target: 'marketing.write', result: 'denied' });
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'marketing:write') }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const action = String(body.action || '');
  const state = await load();

  try {
    if (action === 'upsert') {
      const campaign = normalizeCampaign(body.campaign);
      const exists = state.campaigns.some((c) => c.id === campaign.id);
      const campaigns = exists
        ? state.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
        : [campaign, ...state.campaigns];
      const next = { campaigns: campaigns.slice(0, MAX_CAMPAIGNS) };
      await setConfig(CONFIG_KEYS.marketing, next, session.email);
      await audit({ action: exists ? 'marketing.campaign.updated' : 'marketing.campaign.created', actor: session.email, target: campaign.name, result: 'success' });
      return NextResponse.json({ ok: true, campaigns: next.campaigns, message: exists ? 'Campaign updated.' : 'Campaign created.' });
    }

    if (action === 'set-state') {
      const state_ = STATES.includes(body.state) ? body.state : null;
      if (!state_) return NextResponse.json({ error: 'unknown state' }, { status: 400 });
      const campaigns = state.campaigns.map((c) => (c.id === body.id ? { ...c, state: state_, updatedAt: new Date().toISOString() } : c));
      const next = { campaigns };
      await setConfig(CONFIG_KEYS.marketing, next, session.email);
      await audit({ action: 'marketing.campaign.state', actor: session.email, target: `${body.id} → ${state_}`, result: 'success' });
      return NextResponse.json({ ok: true, campaigns: next.campaigns, message: `Campaign set to ${state_}.` });
    }

    if (action === 'delete') {
      const campaigns = state.campaigns.filter((c) => c.id !== body.id);
      const next = { campaigns };
      await setConfig(CONFIG_KEYS.marketing, next, session.email);
      await audit({ action: 'marketing.campaign.deleted', actor: session.email, target: String(body.id), result: 'success' });
      return NextResponse.json({ ok: true, campaigns: next.campaigns, message: 'Campaign deleted.' });
    }

    if (action === 'record-metrics') {
      // Only an authorized operator reporting a real provider figure reaches here.
      const campaigns = state.campaigns.map((c) => (c.id === body.id
        ? {
            ...c,
            metrics: {
              ...c.metrics,
              ...(body.metrics || {}),
              provider: body.provider ? String(body.provider).slice(0, 60) : c.metrics?.provider,
              reportedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          }
        : c));
      const next = { campaigns };
      await setConfig(CONFIG_KEYS.marketing, next, session.email);
      await audit({ action: 'marketing.metrics.recorded', actor: session.email, target: String(body.id), result: 'success', detail: body.metrics || null });
      return NextResponse.json({ ok: true, campaigns: next.campaigns, message: 'Provider figures recorded.' });
    }

    return NextResponse.json({ error: `unknown action '${action}'` }, { status: 400 });
  } catch (error) {
    await audit({ action: `marketing.${action}`, actor: session.email, target: 'marketing', result: 'failure', reason: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
