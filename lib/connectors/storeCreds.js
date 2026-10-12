
// Admin-supplied connector credentials, held in the keyed server-side config store.
// Reads are always MASKED: the plain value never travels back to the browser.
// Environment variables remain the primary source; stored values only fill a gap,
// so an operator can rotate everything by changing the deployment environment.
import { getConfig } from '../config';

export const CONNECTOR_SLUGS = {
  'playbeat-digital': 'PLAYBEAT_DIGITAL',
  'playbeat-live': 'PLAYBEAT_LIVE',
  magxtv: 'MAGXTV',
  makethisdeal: 'MAKETHISDEAL',
  'pulse-crm': 'PULSE_CRM',
};

export const credKey = (slug) => `admin.connectors.${slug}`;
const hydratedValues = new Map();
export const envKeysFor = (slug) => {
  const p = CONNECTOR_SLUGS[slug];
  return p ? { url: `${p}_API_URL`, key: `${p}_API_KEY` } : { url: null, key: null };
};

export function mask(value) {
  if (!value) return '';
  const s = String(value);
  return s.length <= 4 ? '••••' : `••••••••${s.slice(-4)}`;
}

/** Presence report — never a value. */
export function envPresence() {
  const out = {};
  for (const [slug, prefix] of Object.entries(CONNECTOR_SLUGS)) {
    const u = `${prefix}_API_URL`;
    const k = `${prefix}_API_KEY`;
    out[slug] = {
      urlKey: u, keyKey: k,
      urlPresent: Boolean(process.env[u]) && !hydratedValues.has(u),
      keyPresent: Boolean(process.env[k]) && !hydratedValues.has(k),
    };
  }
  return out;
}

/** Push encrypted credentials into one server invocation without overriding deployment vars. */
export async function hydrateConnectorEnv(slugs = Object.keys(CONNECTOR_SLUGS)) {
  const filled = [];
  for (const slug of slugs) {
    if (!CONNECTOR_SLUGS[slug]) continue;
    try {
      const c = await getConfig(credKey(slug));
      const { url, key } = envKeysFor(slug);
      for (const [envKey, value] of [[url, c?.apiUrl], [key, c?.apiKey]]) {
        if (!envKey) continue;
        const previous = hydratedValues.get(envKey);
        // Refresh or clear only values this warm instance injected itself.
        if (previous !== undefined && process.env[envKey] === previous) {
          if (value) process.env[envKey] = String(value);
          else delete process.env[envKey];
          hydratedValues.delete(envKey);
        }
        if (value && !process.env[envKey]) {
          process.env[envKey] = String(value);
          hydratedValues.set(envKey, process.env[envKey]);
          filled.push(envKey);
        }
      }
    } catch { /* config store unavailable — env-only, fail closed */ }
  }
  return filled;
}
