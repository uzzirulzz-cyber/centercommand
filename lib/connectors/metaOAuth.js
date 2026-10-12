import crypto from 'node:crypto';
import { getConfig, setConfig } from '../config';

export const META_OAUTH_CONFIG_KEY = 'admin.meta.oauth';
export const META_STATE_COOKIE = 'pb_meta_oauth_state';

export const META_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'leads_retrieval',
  'ads_read',
  'instagram_basic',
  'instagram_manage_insights',
  'business_management',
  'whatsapp_business_management',
];

const GRAPH_BASE = 'https://graph.facebook.com';
const safeString = (value, max = 200) => String(value || '').slice(0, max);

export async function metaGet(accessToken, path) {
  const url = new URL(metaGraphUrl(path));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Meta Graph request failed (${response.status})`);
  return payload;
}

export async function discoverMetaAssets(accessToken, scopes = []) {
  const has = (scope) => scopes.includes(scope);
  const output = { pages: [], instagram: [], adAccounts: [], businesses: [], whatsAppAccounts: [] };
  const errors = {};
  if (has('pages_show_list')) {
    try {
      const payload = await metaGet(accessToken, 'me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}&limit=100');
      output.pages = (payload.data || []).map((page) => ({
        id: safeString(page.id, 80), name: safeString(page.name, 160), category: safeString(page.category, 100),
        accessToken: page.access_token || '',
        instagram: page.instagram_business_account || page.connected_instagram_account || null,
      }));
      output.instagram = output.pages.filter((page) => page.instagram).map((page) => ({
        id: safeString(page.instagram.id, 80), username: safeString(page.instagram.username, 120),
        pageId: page.id, pageName: page.name,
      }));
    } catch (error) { errors.pages = safeString(error.message); }
  }
  if (has('ads_read')) {
    try {
      const payload = await metaGet(accessToken, 'me/adaccounts?fields=id,name,account_id,account_status&limit=100');
      output.adAccounts = (payload.data || []).map((account) => ({
        id: safeString(account.id, 80), accountId: safeString(account.account_id, 80),
        name: safeString(account.name, 160), status: account.account_status ?? null,
      }));
    } catch (error) { errors.adAccounts = safeString(error.message); }
  }
  if (has('business_management')) {
    try {
      const payload = await metaGet(accessToken, 'me/businesses?fields=id,name&limit=100');
      output.businesses = (payload.data || []).map((business) => ({ id: safeString(business.id, 80), name: safeString(business.name, 160) }));
    } catch (error) { errors.businesses = safeString(error.message); }
  }
  if (has('whatsapp_business_management') && has('business_management')) {
    for (const business of output.businesses) {
      try {
        const payload = await metaGet(accessToken, `${business.id}/owned_whatsapp_business_accounts?fields=id,name&limit=100`);
        output.whatsAppAccounts.push(...(payload.data || []).map((item) => ({ id: safeString(item.id, 80), name: safeString(item.name, 160), businessId: business.id })));
      } catch (error) { errors.whatsAppAccounts = safeString(error.message); }
    }
  }
  output.errors = errors;
  return output;
}

function encryptionKey() {
  const value = process.env.META_TOKEN_ENCRYPTION_KEY || '';
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  try {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length === 32) return decoded;
  } catch { /* checked below */ }
  return null;
}

export function metaConfigStatus() {
  const callback = process.env.META_OAUTH_REDIRECT_URI || '';
  return {
    appIdConfigured: Boolean(process.env.META_APP_ID),
    appSecretConfigured: Boolean(process.env.META_FB_APP_SECRET),
    graphVersionConfigured: Boolean(process.env.META_GRAPH_VERSION),
    callbackConfigured: Boolean(callback),
    callbackUri: callback || null,
    tokenEncryptionConfigured: Boolean(encryptionKey()),
    ready: Boolean(
      process.env.META_APP_ID && process.env.META_FB_APP_SECRET &&
      process.env.META_GRAPH_VERSION && callback && encryptionKey()
    ),
  };
}

export function encryptMetaToken(value) {
  const key = encryptionKey();
  if (!key) throw new Error('META_TOKEN_ENCRYPTION_KEY must be a 32-byte hex or base64 value');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: encrypted.toString('base64url'),
  };
}

export function decryptMetaToken(envelope) {
  const key = encryptionKey();
  if (!key || envelope?.version !== 1 || !envelope.iv || !envelope.tag || !envelope.data) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const clear = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(clear);
  } catch { return null; }
}

export async function saveMetaToken(token, actor) {
  const encrypted = encryptMetaToken(token);
  await setConfig(META_OAUTH_CONFIG_KEY, encrypted, actor || 'meta-oauth');
}

export async function loadMetaToken() {
  const encrypted = await getConfig(META_OAUTH_CONFIG_KEY, null);
  return decryptMetaToken(encrypted);
}

export function metaGraphUrl(path) {
  const version = safeString(process.env.META_GRAPH_VERSION, 20).replace(/^v/i, '');
  if (!version) throw new Error('META_GRAPH_VERSION is not configured');
  return `${GRAPH_BASE}/v${version}/${String(path).replace(/^\/+/, '')}`;
}

export function metaCallbackUrl() {
  return process.env.META_OAUTH_REDIRECT_URI || '';
}
