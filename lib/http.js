// ============================================================
// Outbound HTTP for connectors: hard timeout, retry with exponential backoff
// + jitter, a token-bucket rate-limit budget, and a circuit breaker that
// degrades an app instead of hammering a failing endpoint (README §5).
// ============================================================

const TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS || 8000);
const MAX_RETRIES = Number(process.env.CONNECTOR_MAX_RETRIES || 3);
const RATE_PER_MIN = Number(process.env.CONNECTOR_RATE_LIMIT || 120);
const BREAKER_THRESHOLD = Number(process.env.CONNECTOR_BREAKER_THRESHOLD || 5);
const BREAKER_COOLDOWN_MS = Number(process.env.CONNECTOR_BREAKER_COOLDOWN_MS || 60000);

const budgets = new Map();  // slug -> { tokens, last }
const breakers = new Map(); // slug -> { failures, openUntil }

export function breakerState(slug) {
  return breakers.get(slug) || { failures: 0, openUntil: 0 };
}
export function breakerOpen(slug) {
  return breakerState(slug).openUntil > Date.now();
}

function takeToken(slug) {
  const now = Date.now();
  const b = budgets.get(slug) || { tokens: RATE_PER_MIN, last: now };
  const refill = ((now - b.last) / 60000) * RATE_PER_MIN;
  b.tokens = Math.min(RATE_PER_MIN, b.tokens + refill);
  b.last = now;
  if (b.tokens < 1) { budgets.set(slug, b); return false; }
  b.tokens -= 1;
  budgets.set(slug, b);
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ConnectorError extends Error {
  constructor(message, { status = null, permanent = false } = {}) {
    super(message);
    this.name = 'ConnectorError';
    this.status = status;
    this.permanent = permanent; // 4xx (except 429) is never retried
  }
}

export async function request(slug, url, { method = 'GET', headers = {}, body, expect = 'json' } = {}) {
  if (breakerOpen(slug)) {
    throw new ConnectorError(
      `Circuit breaker open for ${slug} — cooling down until ${new Date(breakerState(slug).openUntil).toISOString()}`
    );
  }
  if (!takeToken(slug)) throw new ConnectorError(`Rate-limit budget exhausted for ${slug}`);

  let attempt = 0;
  let lastErr;

  while (attempt <= MAX_RETRIES) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctl.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        throw new ConnectorError(`upstream ${res.status}`, { status: res.status });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ConnectorError(
          `upstream ${res.status}: ${text.slice(0, 180)}`,
          { status: res.status, permanent: true }
        );
      }

      recordSuccess(slug);
      if (expect === 'text') return res.text();
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      clearTimeout(timer);
      lastErr = e instanceof ConnectorError ? e : new ConnectorError(String(e?.message || e));
      if (lastErr.permanent) break;
      attempt += 1;
      if (attempt > MAX_RETRIES) break;
      const backoff = Math.min(8000, 250 * 2 ** attempt) * (0.5 + Math.random()); // jitter
      await sleep(Math.round(backoff));
    }
  }

  recordFailure(slug);
  throw lastErr || new ConnectorError('unknown connector failure');
}

function recordSuccess(slug) {
  breakers.set(slug, { failures: 0, openUntil: 0 });
}

function recordFailure(slug) {
  const b = breakerState(slug);
  b.failures += 1;
  if (b.failures >= BREAKER_THRESHOLD) {
    b.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    b.failures = 0;
  }
  breakers.set(slug, b);
}
