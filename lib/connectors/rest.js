// ============================================================
// Generic REST connector adapter (PlayBeat.digital, PlayBeat.live,
// MagXTV.click, MakeThisDeal.biz).
//
// The contract is fixed (README §5); only the base URL and key differ. Every
// method is a no-op that reports 'pending' when credentials are absent — an
// app is never marked healthy without an authenticated 2xx health check.
//
// ASSUMED API SHAPE — NOT VERIFIED. These four apps are first-party, and no API
// specification was supplied, so the resource paths, the `/health` endpoint and
// the list-envelope keys (`data` / `items`, `next_page`) are CONVENTIONS this
// adapter expects. Point it at a real spec or openapi.json and adjust the three
// marked spots. It makes no claim about how these services actually respond.
// ============================================================
import { request } from '../http';
import { upsertRecords, setSyncState } from '../store';

// The store's idempotent upsert is keyed by `sourceId`. Upstreams name their
// primary key differently (`id`, `_id`, `uuid`, …), so normalise it here —
// without this every fetched row is rejected as "no source id".
const ID_FIELDS = ['id', '_id', 'uuid', 'code', 'reference', 'slug', 'key'];
function withSourceId(row) {
  if (!row || typeof row !== 'object' || row.sourceId) return row;
  for (const field of ID_FIELDS) {
    const value = row[field];
    if (value !== null && value !== undefined && typeof value !== 'object') {
      return { ...row, sourceId: String(value) };
    }
  }
  return row;
}

export class RestConnector {
  constructor({ slug, name, envPrefix, resources = [], healthPath = 'health', authOptional = false, defaultBaseUrl = null, healthValidator = null }) {
    this.slug = slug;
    this.name = name;
    this.envPrefix = envPrefix;
    this.resources = resources;
    this.healthPath = healthPath;
    this.authOptional = authOptional;
    this.defaultBaseUrl = defaultBaseUrl;
    this.healthValidator = healthValidator;
  }

  /**
   * Join the base URL and a path without doubling a slash. If the operator set
   * the base URL to the API root already (…/api) and the resource path also
   * carries an api/ prefix, the prefix is dropped so a request is never sent to
   * …/api/api/….
   */
  url(path) {
    const base = String(this.baseUrl || '').replace(/\/+$/, '');
    let p = String(path || '').replace(/^\/+/, '');
    if (/\/api$/i.test(base) && /^api\//i.test(p)) p = p.slice(4);
    return `${base}/${p}`;
  }

  // Precedence: environment variable → stored credential → built-in default.
  // An explicit value always wins, so the default is only a starting point.
  get baseUrl() { return process.env[`${this.envPrefix}_API_URL`] || this.defaultBaseUrl || null; }
  get apiKey() { return process.env[`${this.envPrefix}_API_KEY`] || null; }
  get configured() { return Boolean(this.baseUrl && (this.apiKey || this.authOptional)); }

  get missingVars() {
    const out = [];
    if (!this.baseUrl) out.push(`${this.envPrefix}_API_URL`);
    if (!this.apiKey && !this.authOptional) out.push(`${this.envPrefix}_API_KEY`);
    return out;
  }

  // Async so a subclass can obtain a short-lived token (e.g. a login-issued
  // JWT) before the request is built. The base adapter uses a static bearer.
  async headers() {
    // Convention: bearer auth. Swap here if the service uses a custom header.
    const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  /** Resolve true ONLY on an authenticated 2xx. */
  async healthCheck() {
    if (!this.configured) {
      return { ok: false, status: 'pending', reason: `not configured — missing ${this.missingVars.join(', ')}` };
    }
    try {
      // Spot 1/3: health path — per-app (defaults to /health).
      const data = await request(this.slug, this.url(this.healthPath), { headers: await this.headers() });
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('health endpoint did not return a JSON object');
      }
      const validation = this.healthValidator?.(data);
      if (validation && !validation.ok) {
        return { ok: false, status: 'degraded', reason: validation.reason || 'upstream feed is not ready', checkedAt: new Date().toISOString() };
      }
      return { ok: true, status: 'connected', checkedAt: new Date().toISOString() };
    } catch (e) {
      return { ok: false, status: 'degraded', reason: e.message, checkedAt: new Date().toISOString() };
    }
  }

  async read(resource, { page = 1, perPage = 100, since } = {}) {
    if (!this.configured) throw new Error(`${this.name} is not configured`);
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (since) qs.set('since', since);
    const data = await request(this.slug, `${this.url(resource)}?${qs.toString()}`, {
      headers: await this.headers(),
    });
    // Spot 2/3: list-envelope convention. When the payload exposes total/page/
    // pageSize (as PlayBeat.live's /api/channels does) and no explicit next
    // pointer, paginate from those numbers instead of stopping after page 1.
    const rows = (Array.isArray(data) ? data : (data?.data || data?.items || data?.results || [])).map(withSourceId);
    const nextPage = Array.isArray(data) ? null : (
      data?.next_page ?? data?.nextPage
      ?? (data?.total != null && data?.pageSize
        ? (Number(data.page || 1) * Number(data.pageSize) < Number(data.total) ? Number(data.page || 1) + 1 : null)
        : null)
    );
    return { rows, nextPage };
  }

  async readAll(resource, { maxPages = 100, since } = {}) {
    const out = [];
    let page = 1;
    while (page && page <= maxPages) {
      const { rows, nextPage } = await this.read(resource, { page, since });
      out.push(...rows);
      page = nextPage ? Number(nextPage) : null;
    }
    return out;
  }

  async write(resource, payload) {
    if (!this.configured) throw new Error(`${this.name} is not configured`);
    return request(this.slug, this.url(resource), {
      method: 'POST',
      headers: await this.headers(),
      body: payload,
    });
  }

  /** Idempotent: replay converges, duplicates are impossible. */
  async sync(resources = this.resources, { since } = {}) {
    if (!this.configured) {
      return { ok: false, status: 'pending', reason: `not configured — missing ${this.missingVars.join(', ')}` };
    }
    const startedAt = new Date().toISOString();
    const summary = {};
    try {
      for (const resource of resources) {
        const rows = await this.readAll(resource, { since });
        summary[resource] = await upsertRecords(this.slug, rows);
      }
      const state = await setSyncState(this.slug, {
        status: 'connected',
        lastSync: new Date().toISOString(),
        // Total rows held for this app, so the UI can show "Records stored".
        stored: Object.values(summary).reduce((n, s) => n + (s?.stored || 0), 0),
        lastResult: summary,
        error: null,
      });
      return { ok: true, status: 'connected', startedAt, summary, lastSync: state.lastSync };
    } catch (e) {
      await setSyncState(this.slug, { status: 'degraded', error: e.message, lastAttempt: startedAt });
      return { ok: false, status: 'degraded', reason: e.message, startedAt, summary };
    }
  }
}
