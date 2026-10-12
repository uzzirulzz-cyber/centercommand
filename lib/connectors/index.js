// ============================================================
// Connector registry + the ONE explicit live/demo switch (README §5, §6).
// ============================================================
import { APPS } from '../apps';
import { RestConnector } from './rest';
import { DigitalConnector } from './digital';
import { PulseCrmConnector } from './pulse';
import { WhatsAppConnector } from './meta';
import { getSyncState } from '../store';
import { hydrateConnectorEnv } from './storeCreds';

const ENV_PREFIX = {
  'playbeat-digital': 'PLAYBEAT_DIGITAL',
  'playbeat-live': 'PLAYBEAT_LIVE',
  magxtv: 'MAGXTV',
  makethisdeal: 'MAKETHISDEAL',
};

const RESOURCES = {
  'playbeat-digital': ['products', 'orders', 'customers', 'subscriptions'],
  // Verified live against the deployment on 2026-10-11: GET /api/channels
  // returns { total, page, pageSize, items:[…] } (4,002 channels).
  'playbeat-live': ['api/channels'],
  magxtv: ['api/sports'],
  makethisdeal: ['listings', 'leads', 'enquiries', 'transactions'],
};

// Apps whose own API answers without credentials. Verified 2026-10-11:
// PlayBeat.live GET /api/health and /api/channels returned 200 with no
// Authorization header; MagXTV's API is unauthenticated by design (its sports
// provider key lives inside MagXTV, not in the admin).
const AUTH_OPTIONAL = { magxtv: true, 'playbeat-live': true };

// Health probe per app. Verified live: PlayBeat.live answers GET /api/health.
const HEALTH_PATH = {
  'playbeat-live': 'api/health',
  magxtv: 'api/health',
};

// A reachable HTTP endpoint is not enough to claim a real feed is connected.
// PlayBeat.live reports this field from its own IPTV source configuration.
const HEALTH_VALIDATOR = {
  'playbeat-live': (data) => data?.configured === true
    ? { ok: true }
    : { ok: false, reason: 'PlayBeat.live API is reachable, but its channel source reports configured=false.' },
};

// First-party apps whose public API origin is known and stable. Used ONLY when
// neither an environment variable nor a stored credential is set — an explicit
// value always wins. Verified 2026-10-11: playbeat.live answers GET /api/health
// and GET /api/channels with 200 and no credentials.
const DEFAULT_BASE_URL = {
  'playbeat-live': 'https://playbeat.live',
  magxtv: 'https://magxtv.click',
};

const adapters = {};
for (const app of APPS) {
  if (app.slug === 'pulse-crm') {
    adapters[app.slug] = new PulseCrmConnector();
  } else if (app.slug === 'playbeat-digital') {
    adapters[app.slug] = new DigitalConnector();
  } else {
    adapters[app.slug] = new RestConnector({
      slug: app.slug,
      name: app.name,
      envPrefix: ENV_PREFIX[app.slug],
      resources: RESOURCES[app.slug] || [],
      healthPath: HEALTH_PATH[app.slug],
      healthValidator: HEALTH_VALIDATOR[app.slug],
      authOptional: AUTH_OPTIONAL[app.slug] || false,
      defaultBaseUrl: DEFAULT_BASE_URL[app.slug] || null,
    });
  }
}

export const whatsapp = new WhatsAppConnector();

export function getConnector(slug) {
  return adapters[slug] || null;
}

export const CONNECTOR_MODE = () =>
  (process.env.PB_CONNECTOR_MODE || 'demo').toLowerCase() === 'live' ? 'live' : 'demo';

/**
 * Status for one app. In 'live' mode an unconfigured app is ALWAYS 'pending'
 * with no metrics — the honesty rule, enforced in code rather than promised.
 */
export async function connectorStatus(slug) {
  await hydrateConnectorEnv([slug]);
  const adapter = getConnector(slug);
  const mode = CONNECTOR_MODE();
  if (!adapter) return { slug, mode, configured: false, status: 'pending', reason: 'no adapter' };

  const state = await getSyncState(slug);
  if (mode === 'demo') {
    return {
      slug, mode, configured: adapter.configured,
      status: state?.status || 'demo',
      lastSync: state?.lastSync || null,
      reason: 'PB_CONNECTOR_MODE=demo — fixture data, not live',
      missingVars: adapter.missingVars,
    };
  }
  if (!adapter.configured) {
    return {
      slug, mode, configured: false, status: 'pending',
      lastSync: state?.lastSync || null,
      reason: `not configured — missing ${adapter.missingVars.join(', ')}`,
      missingVars: adapter.missingVars,
    };
  }
  // A configured adapter is not necessarily a working connection. Probe the
  // upstream server before exposing a connected state to operators.
  const health = await adapter.healthCheck();
  return {
    slug, mode, configured: true,
    status: health.ok ? (state?.status === 'degraded' ? 'degraded' : 'connected') : (health.status || 'degraded'),
    checkedAt: health.checkedAt || new Date().toISOString(),
    lastSync: state?.lastSync || null,
    reason: health.ok ? (state?.error || null) : (health.reason || 'health check failed'),
    error: health.ok ? (state?.error || null) : (health.reason || 'health check failed'),
    missingVars: [],
  };
}

export async function allConnectorStatuses() {
  return Promise.all(APPS.map((a) => connectorStatus(a.slug)));
}
