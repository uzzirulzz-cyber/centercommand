import { guard, json } from '../../../../lib/adminRoute';
import { getConfig } from '../../../../lib/config';
import { META_OAUTH_CONFIG_KEY, META_SCOPES, loadMetaToken, metaConfigStatus } from '../../../../lib/connectors/metaOAuth';
import { whatsapp } from '../../../../lib/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WHATSAPP_ENV = ['META_WABA_TOKEN', 'META_PHONE_NUMBER_ID', 'META_GRAPH_VERSION'];

export async function GET(req) {
  const { error } = await guard(req, 'apps:manage');
  if (error) return error;
  const [token, encrypted] = await Promise.all([
    loadMetaToken().catch(() => null),
    getConfig(META_OAUTH_CONFIG_KEY, null).catch(() => null),
  ]);
  const scopes = new Set(token?.scopes || []);
  const validToken = Boolean(token?.accessToken && (!token.expiresAt || Date.parse(token.expiresAt) > Date.now()));
  const configuration = metaConfigStatus();
  const connected = validToken;
  const assets = token?.assets || { pages: [], instagram: [], adAccounts: [], businesses: [], whatsAppAccounts: [], errors: {} };
  const waHealth = await whatsapp.healthCheck();
  const status = (required) => !connected ? 'pending' : required.every((scope) => scopes.has(scope)) ? 'connected' : 'limited';
  const products = [
    { id: 'facebook-login', name: 'Facebook Login', status: connected ? 'connected' : 'pending', detail: connected ? `Connected as ${token.userName || token.userId}` : 'Sign in with the existing Meta app.' },
    { id: 'facebook-leads', name: 'Facebook lead forms', status: status(['pages_show_list', 'leads_retrieval']) === 'connected' && assets.pages.length ? 'connected' : status(['pages_show_list', 'leads_retrieval']), detail: assets.pages.length ? `${assets.pages.length} Page(s) visible to this connection.` : 'Requires a Page selected in the consent flow and approved lead access.' },
    { id: 'facebook-marketing', name: 'Marketing insights', status: status(['ads_read']) === 'connected' && assets.adAccounts.length ? 'connected' : status(['ads_read']), detail: assets.adAccounts.length ? `${assets.adAccounts.length} ad account(s) visible. Reporting is read-only.` : 'Read-only reporting; requires an ad account and Meta review/advanced access.' },
    { id: 'instagram', name: 'Instagram insights', status: status(['instagram_basic', 'instagram_manage_insights']) === 'connected' && assets.instagram.length ? 'connected' : status(['instagram_basic', 'instagram_manage_insights']), detail: assets.instagram.length ? `${assets.instagram.length} professional account(s) linked to Pages.` : 'Professional Instagram account linked to a Page.' },
    { id: 'whatsapp', name: 'WhatsApp Business', status: waHealth.ok ? 'connected' : (connected && scopes.has('whatsapp_business_management') && assets.whatsAppAccounts.length ? 'limited' : waHealth.status || 'pending'), detail: assets.whatsAppAccounts.length ? `${assets.whatsAppAccounts.length} WhatsApp Business Account(s) visible. Messaging requires a separate WhatsApp system-user token and phone number ID.` : waHealth.reason || 'Requires a WhatsApp Business Account and phone number; billing is managed in Meta.' },
  ];
  const configuredWhatsApp = Boolean(waHealth.ok);
  const missing = [
    ['META_APP_ID', configuration.appIdConfigured],
    ['META_FB_APP_SECRET', configuration.appSecretConfigured],
    ['META_GRAPH_VERSION', configuration.graphVersionConfigured],
    ['META_OAUTH_REDIRECT_URI', configuration.callbackConfigured],
    ['META_TOKEN_ENCRYPTION_KEY', configuration.tokenEncryptionConfigured],
  ].filter(([, present]) => !present).map(([name]) => name);

  return json({
    ok: true,
    status: connected ? 'connected' : missing.length ? 'pending' : 'ready',
    configuration: { ...configuration, missing },
    connection: connected ? {
      name: token.userName,
      email: token.userEmail,
      userId: token.userId,
      connectedAt: token.connectedAt,
      expiresAt: token.expiresAt,
      grantedScopes: token.scopes,
      tokenStoredEncrypted: Boolean(encrypted),
    } : null,
    products: products.map((product) => product.id === 'whatsapp'
      ? { ...product, tokenStatus: configuredWhatsApp ? 'live health check passed' : `not healthy; missing ${WHATSAPP_ENV.filter((key) => !process.env[key]).join(', ') || 'valid provider access'}` }
      : product),
    assets: {
      pages: assets.pages.map(({ id, name, category }) => ({ id, name, category })),
      instagram: assets.instagram,
      adAccounts: assets.adAccounts,
      businesses: assets.businesses,
      whatsAppAccounts: assets.whatsAppAccounts,
      errors: assets.errors,
    },
    requestedScopes: META_SCOPES,
    callbackUri: configuration.callbackUri,
  });
}
