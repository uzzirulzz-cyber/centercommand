// ============================================================
// Dashboard widget registry.
//
// Each widget declares: what it shows, which sizes it supports, the permission
// required to see it, and where its data comes from. The dashboard renders
// itself from this list, so the layout builder can show/hide/resize/reorder
// every widget without any page-level change.
// ============================================================

export const WIDGET_SIZES = ['sm', 'md', 'lg', 'xl', 'full'];

export const WIDGETS = [
  {
    id: 'kpi-revenue',
    title: 'Revenue (paid, PKR)',
    group: 'Finance',
    description: 'Paid orders converted to PKR, counted once per source record.',
    sizes: ['sm', 'md'],
    permission: 'dashboard:view',
    dataSource: '/api/admin/finance',
  },
  {
    id: 'kpi-profit',
    title: 'Gross profit',
    group: 'Finance',
    description: 'Revenue less the recorded cost of goods / payout fees.',
    sizes: ['sm', 'md'],
    permission: 'finance:view',
    dataSource: '/api/admin/finance',
  },
  {
    id: 'kpi-orders',
    title: 'Orders & subscriptions',
    group: 'Sales',
    description: 'Order volume across every connected application.',
    sizes: ['sm', 'md'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'kpi-customers',
    title: 'Customer growth',
    group: 'Customers',
    description: 'New customers in the trailing 30 days by source application.',
    sizes: ['sm', 'md'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'kpi-visitors',
    title: 'Active visitors',
    group: 'Website',
    description: 'Concurrent storefront sessions reported by the site connector.',
    sizes: ['sm', 'md'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'kpi-conversion',
    title: 'Conversion performance',
    group: 'Website',
    description: 'Checkout conversion rate for the selected window.',
    sizes: ['sm', 'md'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'chart-revenue',
    title: 'Revenue trend',
    group: 'Finance',
    description: 'Paid revenue over time, per source application.',
    sizes: ['lg', 'xl', 'full'],
    permission: 'dashboard:view',
    dataSource: '/api/admin/finance',
  },
  {
    id: 'chart-orders',
    title: 'Order mix by application',
    group: 'Sales',
    description: 'Share of paid orders by connected application.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'chart-traffic',
    title: 'Traffic & visitors',
    group: 'Website',
    description: 'Storefront sessions and unique visitors.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'funnel-conversion',
    title: 'Conversion funnel',
    group: 'Website',
    description: 'Visit → product view → cart → checkout → paid.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'table-orders',
    title: 'Recent orders — all sources',
    group: 'Sales',
    description: 'Latest orders with their source application and status.',
    sizes: ['lg', 'xl', 'full'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-digital',
  },
  {
    id: 'app-health',
    title: 'Connected application health',
    group: 'System',
    description: 'Live connection status and last successful sync per application.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/health',
  },
  {
    id: 'settlements',
    title: 'Payment settlements',
    group: 'Finance',
    description: 'Settlement batches and reconciliation state by gateway.',
    sizes: ['md', 'lg'],
    permission: 'finance:view',
    dataSource: '/api/admin/finance',
  },
  {
    id: 'marketing-perf',
    title: 'Marketing campaign performance',
    group: 'Marketing',
    description: 'Spend, reach and conversions per active campaign.',
    sizes: ['md', 'lg'],
    permission: 'marketing:write',
    dataSource: '/api/admin/marketing',
  },
  {
    id: 'support-activity',
    title: 'Support activity',
    group: 'Support',
    description: 'Open conversations and median first-response time.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/admin/inbox',
  },
  {
    id: 'tickets',
    title: 'Support ticket metrics',
    group: 'Support',
    description: 'Tickets by state and priority.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/admin/inbox',
  },
  {
    id: 'broadcast-health',
    title: 'Broadcast health',
    group: 'Applications',
    description: 'Channel and match stream health from PlayBeat.live and MagXTV.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/connectors/playbeat-live',
  },
  {
    id: 'activity',
    title: 'System notifications',
    group: 'System',
    description: 'Recent audit and synchronization activity.',
    sizes: ['md', 'lg'],
    permission: 'dashboard:view',
    dataSource: '/api/admin/security',
  },
];

export const WIDGET_IDS = WIDGETS.map((w) => w.id);
export const widgetById = (id) => WIDGETS.find((w) => w.id === id) || null;

export const DEFAULT_DASHBOARD_LAYOUT = {
  widgets: [
    { id: 'kpi-revenue', size: 'sm', visible: true },
    { id: 'kpi-profit', size: 'sm', visible: true },
    { id: 'kpi-orders', size: 'sm', visible: true },
    { id: 'kpi-customers', size: 'sm', visible: true },
    { id: 'chart-revenue', size: 'lg', visible: true },
    { id: 'app-health', size: 'md', visible: true },
    { id: 'table-orders', size: 'lg', visible: true },
    { id: 'activity', size: 'md', visible: true },
    { id: 'kpi-visitors', size: 'sm', visible: false },
    { id: 'kpi-conversion', size: 'sm', visible: false },
    { id: 'chart-orders', size: 'md', visible: false },
    { id: 'chart-traffic', size: 'md', visible: false },
    { id: 'funnel-conversion', size: 'md', visible: false },
    { id: 'settlements', size: 'md', visible: false },
    { id: 'marketing-perf', size: 'md', visible: false },
    { id: 'support-activity', size: 'md', visible: false },
    { id: 'tickets', size: 'md', visible: false },
    { id: 'broadcast-health', size: 'md', visible: false },
  ],
  refreshMs: 60000,
  updatedAt: null,
};

/** Coerce an incoming layout to known widget ids with sane sizes and bounds. */
export function normalizeLayout(input) {
  const incoming = Array.isArray(input?.widgets) ? input.widgets : [];
  const seen = new Set();
  const widgets = [];
  for (const w of incoming) {
    const id = String(w?.id || '');
    if (!WIDGET_IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    widgets.push({
      id,
      size: WIDGET_SIZES.includes(w.size) ? w.size : 'md',
      visible: w.visible !== false,
    });
  }
  // Any widget the client did not mention keeps its default placement.
  for (const fallback of DEFAULT_DASHBOARD_LAYOUT.widgets) {
    if (!seen.has(fallback.id)) widgets.push({ ...fallback });
  }
  const refreshMs = Number(input?.refreshMs);
  return {
    widgets,
    refreshMs: Number.isFinite(refreshMs) ? Math.min(900000, Math.max(15000, Math.round(refreshMs))) : DEFAULT_DASHBOARD_LAYOUT.refreshMs,
    updatedAt: new Date().toISOString(),
  };
}
