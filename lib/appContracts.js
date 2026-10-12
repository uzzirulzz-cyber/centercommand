// ============================================================================
// Application integration contracts — PlayBeat Digital central administration.
//
// Every value below was read from the applications' OWN repositories, cloned
// and inspected on 2026-10-11. Nothing is guessed. NO secret VALUES live here —
// only the NAMES of server-side environment variables. Real values belong in the
// deployment environment or the application's own encrypted config store.
//
// Wiring status: this module is the contract layer. Exposing it through a
// guarded admin route and binding it to the Applications / Payments / Mobile
// pages is the next step; it deliberately contains no auth code of its own.
// ============================================================================

export const GATEWAY_SECRET_POLICY = {
  // Mirrors the precedent set by the storefront (izoko api/_lib/gatewayConfig.ts):
  // gateway credentials are DB-backed and AES-256-GCM encrypted at rest with a
  // key derived from SESSION_SECRET; reads return MASKED values only; env vars
  // remain the bootstrap fallback; DB unavailable or key missing -> env fallback,
  // fail closed. Never render a plaintext key in the admin UI.
  store: 'server-side only (encrypted at rest)',
  cipher: 'aes-256-gcm',
  keySource: 'SESSION_SECRET (never stored beside the data)',
  readsReturn: 'masked values only',
  envRole: 'bootstrap fallback / override source',
  failMode: 'closed',
};

export const APP_CONTRACTS = {
  'playbeat-digital': {
    label: 'PlayBeat Digital',
    origin: 'https://playbeat.digital',
    repo: 'uzzirulzz-cyber/izoko',
    repoVisibility: 'public',
    stack: 'React 19 + Vite SPA, Express server (server.ts), Vercel serverless api/*, MongoDB Atlas',
    database: { engine: 'mongodb', envKeys: ['MONGODB_URI', 'MONGODB_DB_NAME'], defaultDb: 'playbeat' },
    auth: {
      login: 'POST /api/auth/admin/login',
      credentialEnvKeys: ['ADMIN_EMAIL', 'ADMIN_PASSWORD'],
      sessionEnvKeys: ['SESSION_SECRET'],
      requestHeader: 'Authorization: Bearer <admin-jwt>',
      cookieAlternate: 'adminToken',
      notes: 'Same backend for web admin and mobile admin (MOBILE_API.md).',
    },
    apiRoot: '/api/admin',
    resources: {
      orders: ['orders', 'orders-log', 'orders/status'],
      products: ['products', 'products/check-duplicate', 'products/check-seo-duplicates', 'products/seed-if-empty', 'split-variants', 'categories', 'categories/update', 'inventory', 'inventory/adjust'],
      licenses: ['licenses', 'licenses/import', 'licenses/assign'],
      coupons: ['coupons', 'coupons/delete', 'consolidate-giftcards'],
      customers: ['users'],
      staff: ['staff', 'staff/create', 'staff/update', 'staff/delete', 'staff/promote', 'staff/demote', 'audit-logs'],
      reviews: ['reviews', 'reviews/update'],
      services: ['services', 'services-portfolio', 'service-requests'],
      cms: ['cms/homepage', 'cms/homepage/update', 'cms/homepage/delete', 'cms/homepage/reorder', 'cms/settings', 'media', 'documents', 'documents/folders', 'documents/chunk', 'documents/finalize'],
      seo: ['seo', 'seo/audit'],
      analytics: ['stats', 'top-products', 'revenue-chart', 'growth-status'],
      marketing: ['campaigns', 'tracking-config', 'meta-capi-status'],
      payments: ['gateway-config', 'gateway-logs', 'gateway-test', 'gateway-refund', 'gateway-refunds', 'gateway-refund-status', 'gateway-refund-cancel', 'gateway-resolve'],
      support: ['support-messages', 'whatsapp-config', 'whatsapp-status', 'whatsapp-send', 'whatsapp-notify-test', 'whatsapp-templates'],
      mobile: ['app/release', 'app/version', 'app/devices', 'app/devices/revoke', 'app/heartbeat', 'app/notifications', 'app/push/send', 'app/storefront-config', 'app/storefront-config/reset'],
      ops: ['system-health', 'backup', 'backup/restore', 'backup/delete', 'oauth-config', 'profile', 'profile/password', 'profile/avatar', 'avatar'],
    },
    webhook: '/webhooks/rapid-gateway',
    envKeys: ['MONGODB_URI', 'MONGODB_DB_NAME', 'SESSION_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'PUBLIC_SITE_URL',
      'RAPID_SECRET_KEY', 'RAPID_API_BASE', 'RAPID_METHODS', 'RAPID_WEBHOOK_SECRET', 'RAPID_WEBHOOK_SECRET_PREVIOUS',
      'GA4_MEASUREMENT_ID', 'GTM_CONTAINER_ID', 'ADSENSE_CLIENT_ID', 'GOOGLE_ADS_CONVERSION_ID', 'ADS_ENABLED',
      'RESEND_API_KEY', 'EMAIL_FROM', 'META_CAPI_ACCESS_TOKEN', 'META_PIXEL_ID', 'META_WEBHOOK_VERIFY_TOKEN',
      'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET',
      'ANDROID_APP_URL', 'IOS_APP_URL', 'APP_DOWNLOAD_PAGE_VISIBLE', 'VITE_API_BASE'],
    sourceFiles: ['.env.example', 'api/_lib/config.ts', 'api/_lib/gatewayConfig.ts', 'api/_lib/mongo.ts',
      'api/_lib/rapidClient.ts', 'api/_lib/playbeatLive.ts', 'api/admin/index.ts', 'mobile/src/config.ts', 'MOBILE_API.md'],
    status: 'contract-known',
  },

  'playbeat-live': {
    label: 'PlayBeat.live',
    origin: 'https://playbeat.live',
    repo: 'uzzirulzz-cyber/playbeat.live',
    siblingRepos: ['uzzirulzz-cyber/livetv', 'uzzirulzz-cyber/playbeattv'],
    repoVisibility: 'public',
    stack: 'Vite + Express + Cloudflare Workers (livetv: wrangler, R2), Next.js + Prisma (playbeattv)',
    bridge: {
      origin: 'https://playbeat-storefront.crdbixx.workers.dev',
      route: '/api/digital-dashboard',
      header: 'Authorization: Bearer <LIVE_DASHBOARD_TOKEN>',
      envKeys: ['LIVE_DASHBOARD_TOKEN'],
      source: 'izoko api/_lib/playbeatLive.ts',
    },
    resources: {
      channels: ['/api/channels', '/api/geotv/channels', '/api/geotv/image'],
      content: ['/api/content/all', '/api/content/movies', '/api/content/series', '/api/content/songs'],
      catalog: ['/api/catalog/sync-status'],
      analytics: ['/api/analytics/live/event', '/api/analytics/public-config', '/api/google-tracking'],
      commerce: ['/api/checkout/create-order', '/api/checkout/verify-payment'],
      access: ['/api/activecode/callback', '/api/activecode/events', '/api/activecode/events/clear'],
      ops: ['/api/diagnostics/ping', '/api/audit-logs', '/api/cron/daily-report', '/api/cron/maintenance'],
      infra: ['/api/cloudflare/status', '/api/cloudflare/verify', '/api/cloudflare/dns/records', '/api/cloudflare/dns/resolve', '/api/cloudflare/dns/setup-zone'],
    },
    envKeys: ['APP_URL', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_CLIENT_ID', 'DATABASE_URL', 'ADMIN_TOKEN',
      'XTREAM_SERVER_URL', 'XTREAM_API_KEY', 'YOUTUBE_API_KEY', 'STAR_IPTV_API_KEY', 'GEOTV_HOST', 'GEOTV_USER', 'GEOTV_PASS',
      'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_R2_ENDPOINT', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'NODE_ENV'],
    reportingNote: 'GA4 audience must be filtered to PlayBeat.live hostnames; never substitute Digital metrics for missing Live reports.',
    sourceFiles: ['.env.example (playbeat.live / playbeattv / livetv)', 'api route inventory across livetv + playbeattv',
      'izoko api/_lib/playbeatLive.ts', 'izoko AGENTS.md'],
    status: 'contract-known',
  },

  magxtv: {
    label: 'MagXTV.click',
    origin: 'https://magxtv.click',
    repo: 'uzzirulzz-cyber/magxtv.click',
    repoVisibility: 'private',
    publicSibling: 'uzzirulzz-cyber/llivesports (contains a magxtv/ directory)',
    stack: 'Vite + Express (server.ts) + Cloudflare Workers/Functions',
    api: { health: 'GET /api/health', sports: 'GET /api/sports' },
    auth: {
      required: false,
      note: 'The app API is unauthenticated. The upstream sports provider key is configured INSIDE MagXTV (SPORTS_API_URL / SPORTS_API_KEY / SPORTS_API_KEY_HEADER) and is not needed by the admin.',
    },
    resources: { sports: ['/api/sports'] },
    capabilitiesFromHistory: ['live IPTV channel guide', 'MPEG-TS player', 'global channel regions',
      'verified-live-channels-only display rule', 'sports dashboard', 'sports prediction hub', 'sports API contract tests'],
    betting: 'disabled by requirement (prediction hub code exists but is not exposed in the admin)',
    envKeys: ['SPORTS_API_URL', 'SPORTS_API_KEY', 'SPORTS_API_KEY_HEADER'],
    status: 'contract-known',
    sourceFiles: ['server.ts'],
  },

  'makethisdeal': {
    label: 'MakeThisDeal.biz',
    origin: 'https://makethisdeal.biz',
    repo: null,
    candidates: [
      { repo: 'uzzirulzz-cyber/vbn', description: 'Playbeat.digital OmniChannel CRM + Rapid Gateway Payment Integration', stack: 'Next.js + Prisma + NextAuth (shadcn)', envKeys: ['DATABASE_URL', 'DIRECT_URL', 'NEXTAUTH_URL', 'RAPID_GATEWAY_BASE_URL', 'RAPID_GATEWAY_MERCHANT_ID', 'RAPID_GATEWAY_OAUTH_URL', 'RAPID_GATEWAY_TXN_URL', 'AWS_REGION', 'AWS_ENDPOINT_URL_S3', 'EMAIL_PROVIDER', 'EMAIL_API_KEY', 'EMAIL_FROM', 'NEXT_PUBLIC_META_PIXEL_ID'] },
      { repo: 'uzzirulzz-cyber/playbeat-crm-platform', description: 'One platform. Three apps (Storefront + CRM + Admin)', stack: 'Next.js + Prisma' },
    ],
    resources: { listings: ['listings'], leads: ['enquiries', 'leads'], transactions: ['transactions'] },
    status: 'needs-confirmation — no repository carries the MakeThisDeal.biz name',
  },

  'pulse-crm': {
    label: 'PlayBeat Pulse CRM',
    repo: 'uzzirulzz-cyber/eaedpulseplus',
    repoVisibility: 'private',
    stack: 'Vite + Express (server.ts) + MongoDB; JWT auth',
    api: { login: 'POST /api/auth/login', health: 'GET /api/health', healthDb: 'GET /api/health/db' },
    auth: {
      type: 'jwt',
      login: 'POST /api/auth/login  { email, password }',
      requestHeader: 'Authorization: Bearer <token>',
      tokenTtl: '7d',
      credentialEnvKeys: ['PULSE_CRM_ADMIN_EMAIL', 'PULSE_CRM_ADMIN_PASSWORD'],
      staticKeyAlternate: 'a pasted 7-day JWT may be used as PULSE_CRM_API_KEY (expires)',
    },
    resources: {
      leads: ['/api/leads', '/api/leads/export', '/api/leads/batch/assign'],
      pipeline: ['/api/crm/pipeline', '/api/crm/deals', '/api/crm/tasks', '/api/crm/convert-lead'],
      campaigns: ['/api/campaigns'],
      staff: ['/api/staff'],
      seats: ['/api/seats', '/api/seats/route'],
      bots: ['/api/bots', '/api/bots/logs'],
      ops: ['/api/health', '/api/health/db', '/api/system/audit', '/api/database/status'],
    },
    envKeys: ['DATABASE_URL', 'JWT_SECRET', 'SMTP_USER', 'TWILIO_ACCOUNT_SID'],
    securityNote: 'server.ts hard-codes a super-admin fallback (admin@playbeat.live / playbeat1122) — remove it and rely on JWT_SECRET plus a seeded admin.',
    status: 'contract-known',
    sourceFiles: ['server.ts'],
  },
};

export function contractReport(env = {}) {
  const apps = Object.entries(APP_CONTRACTS).map(([slug, c]) => {
    const keys = c.envKeys || [];
    const present = keys.filter((k) => env[k] !== undefined && env[k] !== '');
    const missing = keys.filter((k) => env[k] === undefined || env[k] === '');
    return {
      slug, label: c.label, status: c.status, repo: c.repo,
      apiRoot: c.apiRoot || null, envKeyCount: keys.length,
      present, missing,
      configured: keys.length > 0 && missing.length === 0,
    };
  });
  return {
    apps,
    configured: apps.filter((a) => a.configured).length,
    total: apps.length,
    generatedAt: new Date().toISOString(),
  };
}

export function gatewayKeyNames() {
  return ['RAPID_SECRET_KEY', 'RAPID_API_BASE', 'RAPID_METHODS', 'RAPID_WEBHOOK_SECRET', 'RAPID_WEBHOOK_SECRET_PREVIOUS'];
}
