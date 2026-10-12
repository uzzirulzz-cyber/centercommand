// ============================================================
// Module registry — the single source of truth for navigation AND for the
// generic module workspace. Every entry declares what it is, where it lives,
// which permission is required, and (for data modules) which connector records
// feed it.
//
// Permissions referenced here are real keys in lib/rbac.js; the sidebar filters
// on them so an administrator only sees modules their role can actually use.
// A module whose backend is not configured says so instead of inventing data.
// ============================================================

export const NAV_SECTIONS = [
  {
    label: 'Platform & Ops',
    items: [
      { href: '/admin/dashboards', label: 'Dashboards & Themes', icon: 'bi-columns-gap', perm: 'dashboard:view' },
      { href: '/admin/integration-health', label: 'Integration Health', icon: 'bi-key', perm: 'apps:manage' },
      { href: '/admin/meta', label: 'Meta Business', icon: 'bi-meta', perm: 'apps:manage' },
      { href: '/admin/system-health', label: 'System Health', icon: 'bi-activity', perm: 'dashboard:view' },
      { href: '/admin/applications', label: 'App Registry & Connections', icon: 'bi-plug', perm: 'apps:manage' },
      { href: '/admin/mobile', label: 'Mobile & Android Admin', icon: 'bi-phone', perm: 'mobile:manage' },
      { href: '/admin/backups', label: 'Restore Points', icon: 'bi-arrow-counterclockwise', perm: 'ops:manage' },
      { href: '/admin/audit-log', label: 'Audit Log', icon: 'bi-journal-text', perm: 'audit:view' },
      { href: '/admin/tracking', label: 'Tracking & Measurement', icon: 'bi-graph-up-arrow', perm: 'tracking:write' },
      { href: '/admin/seo-audit', label: 'SEO Audit Runs', icon: 'bi-radar', perm: 'seo:write' },
      { href: '/admin/growth', label: 'Growth Placements', icon: 'bi-megaphone', perm: 'growth:write' },
      { href: '/admin/profile', label: 'Profile & Account', icon: 'bi-person-badge', perm: 'dashboard:view' },
    ],
  },
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', exact: true, perm: 'dashboard:view' },
      { href: '/admin/command-center', label: 'Central Command Center', icon: 'bi-broadcast-pin', perm: 'dashboard:view' },
    ],
  },
  {
    label: 'Sales & Catalog',
    items: [
      { href: '/admin/orders', label: 'Sales & Orders', icon: 'bi-receipt', perm: 'dashboard:view' },
      { href: '/admin/products', label: 'Product Catalog', icon: 'bi-box-seam', perm: 'dashboard:view' },
      { href: '/admin/payments', label: 'Payment Gateways', icon: 'bi-credit-card-2-front', perm: 'payments:manage' },
      { href: '/admin/finance', label: 'Finance & Revenue', icon: 'bi-cash-stack', perm: 'finance:view' },
    ],
  },
  {
    label: 'Website',
    items: [
      { href: '/admin/cms', label: 'Website CMS', icon: 'bi-window-stack', perm: 'cms:write' },
      { href: '/admin/page-builder', label: 'Visual Page Builder', icon: 'bi-layers', perm: 'pagebuilder:write' },
      { href: '/admin/seo', label: 'SEO & Discovery', icon: 'bi-search-heart', perm: 'seo:write' },
    ],
  },
  {
    label: 'Customers & Growth',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: 'bi-people', perm: 'dashboard:view' },
      { href: '/admin/crm', label: 'CRM & Lead Management', icon: 'bi-diagram-3', perm: 'dashboard:view' },
      { href: '/admin/marketing', label: 'Marketing', icon: 'bi-megaphone', perm: 'marketing:write' },
      { href: '/admin/inbox', label: 'WhatsApp / Meta Inbox', icon: 'bi-chat-dots', perm: 'inbox:reply' },
      { href: '/admin/support', label: 'Support & Communications', icon: 'bi-life-preserver', perm: 'support:reply' },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/admin/live', label: 'IPTV / PlayBeat Live', icon: 'bi-play-btn', perm: 'dashboard:view' },
      { href: '/admin/magxtv', label: 'MagXTV Sports', icon: 'bi-trophy', perm: 'dashboard:view' },
      { href: '/admin/sports', label: 'Sports Schedules & Results', icon: 'bi-calendar-event', perm: 'dashboard:view' },
      { href: '/admin/deals', label: 'MakeThisDeal Marketplace', icon: 'bi-briefcase', perm: 'dashboard:view' },
      { href: '/admin/applications', label: 'Applications & Health', icon: 'bi-plug', perm: 'dashboard:view' },
      { href: '/admin/apps', label: 'App Registry', icon: 'bi-grid-3x3-gap', perm: 'dashboard:view' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: 'bi-graph-up-arrow', perm: 'analytics:view' },
      { href: '/admin/reports', label: 'Reports & Exports', icon: 'bi-file-earmark-arrow-down', perm: 'reports:export' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/theme-studio', label: 'Theme Studio', icon: 'bi-palette', perm: 'theme:manage' },
      { href: '/admin/security', label: 'Security & Audit', icon: 'bi-shield-lock', perm: 'security:view' },
      { href: '/admin/staff', label: 'Staff & Permissions', icon: 'bi-person-badge', perm: 'dashboard:view' },
      { href: '/admin/settings', label: 'System Settings', icon: 'bi-sliders', perm: 'dashboard:view' },
    ],
  },
  {
    label: 'Catalog & Services',
    items: [
      { href: '/admin/inventory', label: 'Inventory & Stock', icon: 'bi-boxes', perm: 'dashboard:view' },
      { href: '/admin/licenses', label: 'Digital License Vault', icon: 'bi-key', perm: 'dashboard:view' },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: 'bi-arrow-repeat', perm: 'dashboard:view' },
      { href: '/admin/coupons', label: 'Discounts & Coupons', icon: 'bi-ticket-perforated', perm: 'dashboard:view' },
      { href: '/admin/services', label: 'Services CMS', icon: 'bi-tools', perm: 'dashboard:view' },
      { href: '/admin/requests', label: 'Service Requests', icon: 'bi-inbox', perm: 'dashboard:view' },
    ],
  },
  {
    label: 'Content & Library',
    items: [
      { href: '/admin/media', label: 'Media & Image Manager', icon: 'bi-images', perm: 'dashboard:view' },
      { href: '/admin/documents', label: 'Documents & Files', icon: 'bi-folder2-open', perm: 'dashboard:view' },
      { href: '/admin/reviews', label: 'Reviews Moderation', icon: 'bi-star-half', perm: 'dashboard:view' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.label })));
export const navItemByHref = (href) => ALL_NAV_ITEMS.find((i) => i.href === href) || null;

/* ------------------------------------------------------------------ */
/* Data modules — rendered by <ModuleWorkspace>.                       */
/* `apps` selects which connector record sets feed the grid.           */
/* `keys` lists the preferred columns; the grid also shows any extra   */
/* fields the real payload contains.                                   */
/* ------------------------------------------------------------------ */
export const DATA_MODULES = {
  orders: {
    title: 'Sales & Orders',
    subtitle: 'Orders, subscriptions and payment proofs across every connected application.',
    icon: 'bi-receipt',
    perm: 'dashboard:view',
    writePerm: 'orders:refund',
    apps: ['playbeat-digital', 'playbeat-live', 'makethisdeal'],
    keys: [
      ['orderNo', 'Order'],
      ['customer', 'Customer'],
      ['item', 'Item'],
      ['amount', 'Amount'],
      ['currency', 'Currency'],
      ['status', 'Status'],
    ],
    statusKey: 'status',
    currencyKeys: ['amount'],
    note: 'Each payment is keyed by (source application, source record id), so a cross-app sync can never count the same payment twice.',
  },
  products: {
    title: 'Product Catalog',
    subtitle: 'Products, inventory and digital licences from the PlayBeat.digital catalog.',
    icon: 'bi-box-seam',
    perm: 'dashboard:view',
    writePerm: 'products:write',
    apps: ['playbeat-digital'],
    keys: [
      ['sku', 'SKU'],
      ['name', 'Product'],
      ['type', 'Type'],
      ['price', 'Price'],
      ['currency', 'Currency'],
      ['licenses', 'Licences'],
      ['status', 'Status'],
    ],
    statusKey: 'status',
    note: 'Writes are proxied to the storefront connector and require products:write.',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Combined customer records. Linked only through verified identifiers — never merged by name.',
    icon: 'bi-people',
    perm: 'dashboard:view',
    apps: ['playbeat-digital', 'playbeat-live', 'makethisdeal', 'pulse-crm'],
    keys: [
      ['name', 'Customer'],
      ['email', 'Verified identifier'],
      ['phone', 'Phone'],
      ['spend', 'Lifetime value'],
      ['currency', 'Currency'],
      ['since', 'Customer since'],
    ],
    note: 'Every row keeps its original source application and source record id.',
  },
  crm: {
    title: 'CRM & Lead Management',
    subtitle: 'Pipelines, leads, assignments, tasks and follow-ups.',
    icon: 'bi-diagram-3',
    perm: 'dashboard:view',
    writePerm: 'crm:assign',
    apps: ['pulse-crm', 'makethisdeal', 'meta'],
    keys: [
      ['name', 'Lead'],
      ['stage', 'Stage'],
      ['owner', 'Owner'],
      ['channel', 'Channel'],
      ['value', 'Value'],
      ['currency', 'Currency'],
      ['lastTouch', 'Last touch'],
    ],
    statusKey: 'stage',
    kanbanKey: 'stage',
    note: 'Lead rows retain their source (Pulse CRM, MakeThisDeal or Meta Lead Ads); Meta lead records are synced from granted Facebook lead forms.',
  },
  deals: {
    title: 'MakeThisDeal Marketplace',
    subtitle: 'Listings, leads, enquiries and transactions.',
    icon: 'bi-briefcase',
    perm: 'dashboard:view',
    apps: ['makethisdeal'],
    keys: [
      ['title', 'Listing'],
      ['category', 'Category'],
      ['value', 'Value'],
      ['currency', 'Currency'],
      ['enquiries', 'Enquiries'],
      ['status', 'Status'],
    ],
    statusKey: 'status',
  },
  live: {
    title: 'IPTV / PlayBeat Live',
    subtitle: 'Channels, playlists, playback health and audience analytics.',
    icon: 'bi-play-btn',
    perm: 'dashboard:view',
    writePerm: 'broadcast:control',
    apps: ['playbeat-live'],
    keys: [
      ['name', 'Channel'],
      ['category', 'Category'],
      ['playlist', 'Playlist'],
      ['status', 'Status'],
      ['health', 'Playback health'],
      ['viewers', 'Viewers'],
    ],
    statusKey: 'status',
  },
  magxtv: {
    title: 'MagXTV Sports',
    subtitle: 'Schedules, results, highlights and broadcast health. Betting remains disabled.',
    icon: 'bi-trophy',
    perm: 'dashboard:view',
    writePerm: 'broadcast:control',
    apps: ['magxtv'],
    keys: [
      ['league', 'League'],
      ['home', 'Home'],
      ['away', 'Away'],
      ['time', 'Kick-off (UTC)'],
      ['status', 'Status'],
      ['health', 'Broadcast health'],
    ],
    statusKey: 'status',
    betting: false,
  },
  inbox: {
    title: 'WhatsApp / Meta Inbox',
    subtitle: 'Messaging from the Meta Business and WhatsApp Cloud APIs. Only capabilities the provider actually grants are enabled.',
    icon: 'bi-chat-dots',
    perm: 'inbox:reply',
    writePerm: 'inbox:reply',
    apps: ['whatsapp'],
    keys: [
      ['from', 'Contact'],
      ['kind', 'Event'],
      ['text', 'Message'],
      ['receivedAt', 'Received'],
    ],
    note: 'Send is enabled only when the WhatsApp connector reports configured; the endpoint never claims a delivery it did not make.',
  },
  support: {
    title: 'Support & Communications',
    subtitle: 'Support conversations, ticket state and response metrics.',
    icon: 'bi-life-preserver',
    perm: 'support:reply',
    writePerm: 'support:reply',
    apps: ['playbeat-digital', 'pulse-crm'],
    keys: [
      ['subject', 'Subject'],
      ['customer', 'Customer'],
      ['channel', 'Channel'],
      ['priority', 'Priority'],
      ['status', 'Status'],
      ['updatedAt', 'Updated'],
    ],
    statusKey: 'status',
  },

  inventory: {
    title: 'Inventory & Stock',
    subtitle: 'Stock on hand, reservations and reorder levels per warehouse.',
    icon: 'bi-boxes',
    perm: 'dashboard:view',
    writePerm: 'products:write',
    apps: ['playbeat-digital'],
    keys: [['sku','SKU'],['name','Item'],['warehouse','Warehouse'],['onHand','On hand'],['reserved','Reserved'],['reorderLevel','Reorder at'],['status','Status']],
    statusKey: 'status',
    note: 'Writes are proxied to the storefront connector; low-stock figures come from the source application, never estimated.',
  },
  licenses: {
    title: 'Digital License Vault',
    subtitle: 'Issued digital licences, their validity window and revocation state.',
    icon: 'bi-key',
    perm: 'dashboard:view',
    writePerm: 'products:write',
    apps: ['playbeat-digital'],
    keys: [['licenseKey','Licence (masked)'],['product','Product'],['customer','Issued to'],['issuedAt','Issued'],['expiresAt','Expires'],['status','Status']],
    statusKey: 'status',
    note: 'Full licence keys are never rendered in the dashboard; only a masked reference is shown.',
  },
  subscriptions: {
    title: 'Subscriptions',
    subtitle: 'Recurring plans across the storefront and the live service.',
    icon: 'bi-arrow-repeat',
    perm: 'dashboard:view',
    writePerm: 'orders:refund',
    apps: ['playbeat-digital','playbeat-live'],
    keys: [['customer','Customer'],['plan','Plan'],['amount','Amount'],['currency','Currency'],['interval','Billing'],['renewsAt','Renews'],['status','Status']],
    statusKey: 'status',
    note: 'Amounts keep their own currency; PKR is the reporting currency only.',
  },
  coupons: {
    title: 'Discounts & Coupons',
    subtitle: 'Coupon codes, usage limits and expiry.',
    icon: 'bi-ticket-perforated',
    perm: 'dashboard:view',
    writePerm: 'products:write',
    apps: ['playbeat-digital'],
    keys: [['code','Code'],['type','Type'],['value','Value'],['currency','Currency'],['uses','Uses'],['maxUses','Limit'],['expiresAt','Expires'],['status','Status']],
    statusKey: 'status',
  },
  media: {
    title: 'Media & Image Manager',
    subtitle: 'Storefront media library: files, dimensions and folders.',
    icon: 'bi-images',
    perm: 'dashboard:view',
    writePerm: 'cms:write',
    apps: ['playbeat-digital'],
    keys: [['filename','File'],['kind','Type'],['folder','Folder'],['sizeKb','Size (KB)'],['dimensions','Dimensions'],['updatedAt','Updated']],
  },
  documents: {
    title: 'Documents & Files',
    subtitle: 'Business documents with their visibility and owner.',
    icon: 'bi-folder2-open',
    perm: 'dashboard:view',
    writePerm: 'cms:write',
    apps: ['playbeat-digital'],
    keys: [['name','Document'],['type','Type'],['sizeKb','Size (KB)'],['owner','Owner'],['visibility','Visibility'],['updatedAt','Updated']],
  },
  reviews: {
    title: 'Reviews Moderation',
    subtitle: 'Customer reviews awaiting moderation or already published.',
    icon: 'bi-star-half',
    perm: 'dashboard:view',
    writePerm: 'products:write',
    apps: ['playbeat-digital'],
    keys: [['product','Product'],['reviewer','Reviewer'],['rating','Rating'],['text','Review'],['submittedAt','Submitted'],['status','Status']],
    statusKey: 'status',
  },
  services: {
    title: 'Services CMS',
    subtitle: 'Service catalogue entries sold alongside products.',
    icon: 'bi-tools',
    perm: 'dashboard:view',
    writePerm: 'cms:write',
    apps: ['playbeat-digital'],
    keys: [['name','Service'],['category','Category'],['price','Price'],['currency','Currency'],['duration','Duration'],['status','Status']],
    statusKey: 'status',
  },
  requests: {
    title: 'Service Requests',
    subtitle: 'Inbound service requests and their handling state.',
    icon: 'bi-inbox',
    perm: 'dashboard:view',
    writePerm: 'support:reply',
    apps: ['playbeat-digital','makethisdeal'],
    keys: [['reference','Reference'],['customer','Customer'],['service','Requested service'],['budget','Budget'],['currency','Currency'],['submittedAt','Submitted'],['status','Status']],
    statusKey: 'status',
  },
};

/* Modules persisted through the keyed config store rather than connector reads. */
export const CONFIG_MODULES = {
  cms: { title: 'Website CMS', subtitle: 'Pages, navigation, home sections and SEO metadata for the storefront.', icon: 'bi-window-stack', perm: 'cms:write', writePerm: 'cms:write' },
  marketing: { title: 'Marketing', subtitle: 'Campaigns, audiences and attribution. Spend is only shown when a provider reports it.', icon: 'bi-megaphone', perm: 'marketing:write', writePerm: 'marketing:write' },
  seo: { title: 'SEO & Discovery', subtitle: 'Per-page metadata, sitemap and indexation controls.', icon: 'bi-search-heart', perm: 'seo:write', writePerm: 'seo:write' },
  payments: { title: 'Payment Gateways', subtitle: 'Gateway configuration and settlement state. Secrets stay in the environment.', icon: 'bi-credit-card-2-front', perm: 'payments:manage', writePerm: 'payments:manage' },
};
