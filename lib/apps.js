// Central App Registry — every connected application is described here.
// Status values: connected | degraded | pending | disconnected
// 'pending' = registered but requires configuration before it can be marked healthy.

export const APP_COLORS = {
  'playbeat-digital': '#4c8dff',
  'playbeat-live': '#7c5cff',
  magxtv: '#2fbf71',
  makethisdeal: '#f5a623',
  'pulse-crm': '#e5537a',
};

export const APPS = [
  {
    slug: 'playbeat-digital',
    name: 'PlayBeat.digital',
    short: 'Digital',
    domain: 'playbeat.digital',
    connector: 'REST API (native)',
    status: 'pending',
    modules: ['Products & licenses', 'Orders & payments', 'Customers', 'Subscriptions'],
    summary: 'Storefront, products, orders, customers, subscriptions and payments.',
    sourceRepository: {
      name: 'uzzirulzz-cyber/izoko',
      url: 'https://github.com/uzzirulzz-cyber/izoko',
      branch: 'main',
    },
    sourceModules: [
      {
        name: 'Storefront & product catalog',
        description: 'Product browsing, catalog APIs, categories and product detail views.',
        path: 'api/products/index.ts',
      },
      {
        name: 'Orders, checkout & payments',
        description: 'Order handling, checkout flows, payment processing and receipts.',
        path: 'api/orders/index.ts',
      },
      {
        name: 'Digital licenses & fulfillment',
        description: 'License inventory and automated order fulfillment.',
        path: 'api/_lib/licenses.ts',
      },
      {
        name: 'Accounts & authentication',
        description: 'Customer accounts, sign-in and account management.',
        path: 'api/auth/index.ts',
      },
      {
        name: 'Analytics & reporting',
        description: 'Store activity analytics and reporting endpoints.',
        path: 'api/analytics/index.ts',
      },
      {
        name: 'Content management',
        description: 'CMS API and editable homepage sections.',
        path: 'api/cms/index.ts',
      },
      {
        name: 'SEO & site discovery',
        description: 'SEO audit, crawling and provider integrations.',
        path: 'api/_lib/seoAuditEngine.ts',
      },
      {
        name: 'Services marketplace',
        description: 'Service listings, detail pages and customer requests.',
        path: 'src/components/services/ServicesPage.tsx',
      },
      {
        name: 'Mobile apps',
        description: 'Mobile app management and release support.',
        path: 'api/_lib/mobileApps.ts',
      },
      {
        name: 'Customer support & contact',
        description: 'Contact requests and live support experiences.',
        path: 'api/contact.ts',
      },
      {
        name: 'Business analytics & Google settings',
        description: 'Central Google tracking settings, event coverage and storefront observations. GA4 reports and AdSense revenue remain unverified until provider reporting is connected.',
        path: 'src/components/admin/BusinessAnalyticsPanel.tsx',
      },
      {
        name: 'PlayBeat Live dashboard & event bridge',
        description: 'Separate first-party Live activity, bridge health, daily targets and public promotion status.',
        path: 'api/_lib/playbeatLive.ts',
      },
      {
        name: 'CMS & storefront configuration',
        description: 'Homepage content, storefront settings, campaigns and promotion controls.',
        path: 'src/components/admin/CmsPanel.tsx',
      },
      {
        name: 'SEO control center',
        description: 'Technical audits, search visibility and Google Search Console reports.',
        path: 'src/components/admin/SeoControlCenter.tsx',
      },
      {
        name: 'Mobile apps & releases',
        description: 'Android app metadata, release management and mobile delivery.',
        path: 'src/components/admin/MobileAppsPanel.tsx',
      },
      {
        name: 'Campaigns & promotions',
        description: 'Marketing campaigns, public promotion status and campaign performance.',
        path: 'src/components/admin/CampaignsPanel.tsx',
      },
      {
        name: 'Payment gateways & finance',
        description: 'Gateway configuration, payment operations and settlement reporting.',
        path: 'src/components/admin/GatewayPanel.tsx',
      },
      {
        name: 'Support inbox & service requests',
        description: 'Customer support messages, service requests and operational follow-up.',
        path: 'src/components/admin/SupportPanel.tsx',
      },
      {
        name: 'System health, staff & backups',
        description: 'Operations health, staff accounts, access controls and backup workflows.',
        path: 'src/components/admin/SystemHealthPanel.tsx',
      },
      {
        name: 'Growth status',
        description: 'Public promotion, launch checklist and measured growth indicators.',
        path: 'src/components/admin/GrowthStatusPanel.tsx',
      },
    ],
  },
  {
    slug: 'playbeat-live',
    name: 'PlayBeat.live',
    short: 'Live',
    domain: 'playbeat.live',
    connector: 'REST API (native)',
    status: 'pending',
    modules: ['Channels', 'Playlists', 'Playback health', 'Audience analytics'],
    summary: 'Entertainment streaming, live channels, playlists and audience metrics.',
  },
  {
    slug: 'magxtv',
    name: 'MagXTV.click',
    short: 'MagXTV',
    domain: 'magxtv.click',
    connector: 'REST API (native)',
    status: 'pending',
    modules: ['Schedules', 'Results', 'Highlights', 'Broadcast health'],
    summary: 'Sports broadcasting: live matches, schedules, results and statistics.',
  },
  {
    slug: 'makethisdeal',
    name: 'MakeThisDeal.biz',
    short: 'Deals',
    domain: 'makethisdeal.biz',
    connector: 'REST API (native)',
    status: 'pending',
    modules: ['Listings', 'Leads', 'Enquiries', 'Transactions'],
    summary: 'Business marketplace: listings, leads, enquiries and transactions.',
  },
  {
    slug: 'pulse-crm',
    name: 'PlayBeat Pulse CRM',
    short: 'Pulse CRM',
    domain: 'crm.playbeat.digital',
    connector: 'GitHub: uzzirulzz-cyber/eaedpulseplus (stub installed)',
    status: 'pending',
    lastSync: null,
    modules: ['Pipelines', 'Leads', 'Tasks', 'WhatsApp / Meta integrations'],
    summary: 'CRM pipelines, lead management, tasks and messaging integrations.',
  },
];

export const appBySlug = (slug) => APPS.find((a) => a.slug === slug);
