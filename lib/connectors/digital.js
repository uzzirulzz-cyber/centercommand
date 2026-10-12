// ============================================================
// PlayBeat.digital connector.
//
// The Digital API authenticates with a SHORT-LIVED admin JWT
// (`Authorization: Bearer <admin-jwt>`) obtained from
// `POST /api/auth/admin/login` — not a static key. A static key can still be
// used when one is supplied. Contract read from the app's own repository
// (lib/appContracts.js). The login response field name was not confirmed, so
// the common ones are accepted; a login that returns none reports the reason
// instead of guessing.
// ============================================================
import { RestConnector } from './rest';
import { request } from '../http';

const TOKEN_FIELDS = ['token', 'accessToken', 'access_token', 'jwt', 'adminToken', 'idToken'];

// Module-scope cache — lives for the life of a warm server instance only.
let cache = { token: null, expiresAt: 0 };

export class DigitalConnector extends RestConnector {
  constructor() {
    super({
      slug: 'playbeat-digital',
      name: 'PlayBeat.digital',
      envPrefix: 'PLAYBEAT_DIGITAL',
      resources: ['orders', 'products', 'users'],
      healthPath: '/system-health',
    });
  }

  get email() { return process.env.PLAYBEAT_DIGITAL_ADMIN_EMAIL || null; }
  get password() { return process.env.PLAYBEAT_DIGITAL_ADMIN_PASSWORD || null; }

  /** Configured with EITHER a static key OR admin credentials used to log in. */
  get configured() { return Boolean(this.baseUrl && (this.apiKey || (this.email && this.password))); }

  get missingVars() {
    const out = [];
    if (!this.baseUrl) out.push('PLAYBEAT_DIGITAL_API_URL');
    if (!this.apiKey && !(this.email && this.password)) {
      out.push('PLAYBEAT_DIGITAL_API_KEY (or PLAYBEAT_DIGITAL_ADMIN_EMAIL + PLAYBEAT_DIGITAL_ADMIN_PASSWORD)');
    }
    return out;
  }

  /** The API root is …/api/admin; the login route sits at /api/auth/admin/login. */
  get loginUrl() {
    try { return `${new URL(this.baseUrl).origin}/api/auth/admin/login`; } catch { return null; }
  }

  async jwt() {
    const now = Date.now();
    if (cache.token && cache.expiresAt > now + 30_000) return cache.token;
    if (!this.loginUrl) throw new Error('PLAYBEAT_DIGITAL_API_URL is not a valid absolute URL');
    const res = await request(this.slug, this.loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: { email: this.email, password: this.password },
    });
    const token = TOKEN_FIELDS.map((f) => res?.[f] || res?.data?.[f]).find(Boolean);
    if (!token) throw new Error('admin login returned no token');
    const ttl = Number(res?.expiresIn || res?.expires_in || 0);
    cache = { token, expiresAt: now + (ttl ? ttl * 1000 : 10 * 60 * 1000) };
    return token;
  }

  async headers() {
    const token = this.apiKey || await this.jwt();
    return { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  }
}
