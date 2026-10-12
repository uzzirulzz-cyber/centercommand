// ============================================================
// Meta / WhatsApp Business Cloud API adapter.
//
// VERIFIED against Meta's official documentation (see README §9 for the exact
// quotes and links):
//   • Send a message:
//       POST https://graph.facebook.com/{Version}/{Phone-Number-ID}/messages
//       Authorization: Bearer <access token>
//   • Webhook signature: HMAC-SHA256 over the RAW request body, keyed with the
//       App Secret, compared against the `X-Hub-Signature-256` header
//       (the value is prefixed `sha256=`).
//
// The Graph API version is REQUIRED from the environment and has no default —
// hardcoding a version would silently rot as Meta expires it.
// ============================================================
import crypto from 'node:crypto';
import { request } from '../http';

const GRAPH_BASE = 'https://graph.facebook.com';

export class WhatsAppConnector {
  constructor() {
    this.slug = 'whatsapp';
    this.name = 'Meta / WhatsApp Business';
  }

  get version() { return process.env.META_GRAPH_VERSION || null; }
  get token() { return process.env.META_WABA_TOKEN || null; }
  get phoneNumberId() { return process.env.META_PHONE_NUMBER_ID || null; }
  get appSecret() { return process.env.META_FB_APP_SECRET || null; }
  get verifyToken() { return process.env.META_WEBHOOK_VERIFY_TOKEN || null; }

  get configured() { return Boolean(this.version && this.token && this.phoneNumberId); }

  get missingVars() {
    const out = [];
    if (!this.version) out.push('META_GRAPH_VERSION');
    if (!this.token) out.push('META_WABA_TOKEN');
    if (!this.phoneNumberId) out.push('META_PHONE_NUMBER_ID');
    return out;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /** GET /{version}/{phone-number-id} — a cheap authenticated read. */
  async healthCheck() {
    if (!this.configured) {
      return { ok: false, status: 'pending', reason: `not configured — missing ${this.missingVars.join(', ')}` };
    }
    try {
      const data = await request(this.slug, `${GRAPH_BASE}/${this.version}/${this.phoneNumberId}`, {
        headers: this.headers(),
      });
      return { ok: true, status: 'connected', checkedAt: new Date().toISOString(), detail: data?.display_phone_number || null };
    } catch (e) {
      return { ok: false, status: 'degraded', reason: e.message, checkedAt: new Date().toISOString() };
    }
  }

  /** Service message inside the customer-service window. */
  async sendText(to, body) {
    if (!this.configured) throw new Error('WhatsApp is not configured');
    return request(this.slug, `${GRAPH_BASE}/${this.version}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
    });
  }

  /**
   * Verify `X-Hub-Signature-256` over the RAW body. MUST be called with the
   * unparsed bytes — re-serialising JSON changes the digest.
   */
  verifySignature(rawBody, headerValue) {
    if (!this.appSecret || !headerValue) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(headerValue));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b); // constant-time
  }

  /** Meta's GET subscription handshake. */
  verifyChallenge(searchParams) {
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    if (!this.verifyToken) return null;
    if (mode !== 'subscribe' || !token || !challenge) return null;
    const a = Buffer.from(token);
    const b = Buffer.from(this.verifyToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return challenge;
  }
}
