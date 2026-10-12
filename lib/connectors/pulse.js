// ============================================================
// PlayBeat Pulse CRM — repo `uzzirulzz-cyber/eaedpulseplus`.
//
// Contract read from the repository on 2026-10-11 (it is private; the earlier
// build could not fetch it and assumed a generic shape — that guess is replaced
// here with the real routes):
//   • POST /api/auth/login { email, password } -> { token }  (JWT, 7-day expiry)
//   • every data route expects  Authorization: Bearer <token>
//   • GET /api/health is unauthenticated and is the health probe
//
// A static key (a pasted 7-day JWT) is also accepted, so the app can be
// configured from the Integration Health form; email + password must go in the
// deployment environment because the form only carries a URL and a key.
// ============================================================
import { RestConnector } from './rest';
import { request } from '../http';

const TOKEN_FIELDS = ['token', 'accessToken', 'access_token', 'jwt'];

// Module-scope cache — lives for the life of a warm server instance only.
let cache = { token: null, expiresAt: 0 };

export class PulseCrmConnector extends RestConnector {
  constructor() {
    super({
      slug: 'pulse-crm',
      name: 'PlayBeat Pulse CRM',
      envPrefix: 'PULSE_CRM',
      resources: ['leads', 'crm/pipeline', 'campaigns', 'staff', 'seats'],
      healthPath: 'health',
    });
    this.repo = process.env.PULSE_CRM_REPO || 'uzzirulzz-cyber/eaedpulseplus';
  }

  get email() { return process.env.PULSE_CRM_ADMIN_EMAIL || null; }
  get password() { return process.env.PULSE_CRM_ADMIN_PASSWORD || null; }

  get configured() { return Boolean(this.baseUrl && (this.apiKey || (this.email && this.password))); }

  get missingVars() {
    const out = [];
    if (!this.baseUrl) out.push('PULSE_CRM_API_URL');
    if (!this.apiKey && !(this.email && this.password)) {
      out.push('PULSE_CRM_API_KEY (or PULSE_CRM_ADMIN_EMAIL + PULSE_CRM_ADMIN_PASSWORD)');
    }
    return out;
  }

  async jwt() {
    const now = Date.now();
    if (cache.token && cache.expiresAt > now + 30_000) return cache.token;
    const res = await request(this.slug, this.url('auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: { email: this.email, password: this.password },
    });
    const token = TOKEN_FIELDS.map((f) => res?.[f] || res?.data?.[f]).find(Boolean);
    if (!token) throw new Error('Pulse CRM login returned no token');
    const ttl = Number(res?.expiresIn || res?.expires_in || 0);
    cache = { token, expiresAt: now + (ttl ? ttl * 1000 : 7 * 24 * 60 * 60 * 1000) };
    return token;
  }

  async headers() {
    const token = this.apiKey || await this.jwt();
    return { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  }

  /** Never reports healthy while unconfigured — no fabricated CRM metrics. */
  async healthCheck() {
    if (!this.configured) {
      return {
        ok: false,
        status: 'pending',
        reason: `not configured — missing ${this.missingVars.join(', ')} (source: ${this.repo})`,
      };
    }
    return super.healthCheck();
  }
}
