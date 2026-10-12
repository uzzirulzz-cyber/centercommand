import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { audit } from '../../../../lib/audit';
import { getAdminConfig, setAdminConfig, deleteAdminConfig } from '../../../../lib/admin-config';
import { getSession } from '../../../../lib/auth/sessions';
import { csrfValid } from '../../../../lib/auth/guard';
import { can, denyReason } from '../../../../lib/rbac';
import { DEFAULT_THEME } from '../../../../lib/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SECTIONS = [
  { id: 'header', title: 'Header & navigation', description: 'Storefront branding, primary navigation and account entry points.', visible: true, source: 'src/components/Header.tsx' },
  { id: 'hero', title: 'Hero banner', description: 'Primary PlayBeat Digital storefront introduction.', visible: true, source: 'src/components/HeroBanner.tsx' },
  { id: 'categories', title: 'Product categories', description: 'Browse software, subscriptions, gift cards and digital products.', visible: true, source: 'src/components/CategoryNav.tsx' },
  { id: 'featured', title: 'Featured products', description: 'Selected products and marketplace offers.', visible: true, source: 'src/components/StorefrontShowcaseSections.tsx' },
  { id: 'deals', title: 'Promotional offers', description: 'Limited-time offers, campaign placements and featured deals.', visible: true, source: 'src/components/FlashDealsBanner.tsx' },
  { id: 'cms-blocks', title: 'CMS content blocks', description: 'Reusable homepage content managed by the storefront CMS.', visible: true, source: 'src/components/CmsHomepageSections.tsx' },
  { id: 'call-to-action', title: 'Call to action', description: 'A focused next step for visitors, such as browsing offers or requesting a service.', visible: true, source: 'src/components/CmsHomepageSections.tsx' },
  { id: 'services', title: 'Services marketplace', description: 'Professional digital services and customer requests.', visible: true, source: 'src/components/services/ServicesPage.tsx' },
  { id: 'trust', title: 'Trust & delivery', description: 'Customer confidence, secure checkout and fulfillment information.', visible: true, source: 'src/components/TrustFeatures.tsx' },
  { id: 'app-download', title: 'Mobile app promotion', description: 'PlayBeat app download links and installation guidance.', visible: true, source: 'src/components/app/AppDownloadSection.tsx' },
  { id: 'brand-logos', title: 'Brand showcase', description: 'Brand and partner marks used by the storefront.', visible: true, source: 'src/components/BrandLogos.tsx' },
  { id: 'faq', title: 'Frequently asked questions', description: 'Answers to common marketplace and delivery questions.', visible: true, source: 'src/components/FAQSection.tsx' },
  { id: 'footer', title: 'Footer & company information', description: 'Contact, policies and company links.', visible: true, source: 'src/components/Footer.tsx' },
];

const DEFAULT_PAGE_DRAFT = { version: 1, sections: PAGE_SECTIONS };
const NAV_PATHS = new Set(['/admin', '/admin/apps', '/admin/products', '/admin/orders', '/admin/customers', '/admin/page-builder', '/admin/theme-studio', '/admin/reports', '/admin/live', '/admin/sports', '/admin/deals', '/admin/settings', '/admin/staff', '/admin/apps/playbeat-digital', '/admin/apps/playbeat-live', '/admin/apps/magxtv', '/admin/apps/makethisdeal', '/admin/apps/pulse-crm']);
const WIDGET_IDS = new Set(['kpis', 'revenue', 'connections', 'live', 'orders', 'activity']);
const userKey = (session, name) => `user:${session.userId}:${name}`;
const validHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

function normalizeTheme(input) {
  if (!input || typeof input !== 'object') throw new Error('Theme settings are required.');
  const colors = { ...DEFAULT_THEME.colors, ...(input.colors || {}) };
  for (const [key, value] of Object.entries(colors)) {
    if (!validHex(value)) throw new Error(`Invalid color value for ${key}.`);
  }
  const fontChoices = [
    'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
    'Manrope, system-ui, -apple-system, Segoe UI, sans-serif',
    'DM Sans, system-ui, -apple-system, Segoe UI, sans-serif',
    'system-ui, -apple-system, Segoe UI, sans-serif',
  ];
  const gradient = input.gradient || DEFAULT_THEME.gradient;
  if (!validHex(gradient.start) || !validHex(gradient.end)) throw new Error('Gradient colors must use six-digit hex values.');
  return {
    name: String(input.name || DEFAULT_THEME.name).slice(0, 48),
    preset: String(input.preset || DEFAULT_THEME.preset).slice(0, 48),
    appearance: ['light', 'dark', 'auto'].includes(input.appearance) ? input.appearance : 'dark',
    colors,
    fontFamily: fontChoices.includes(input.fontFamily) ? input.fontFamily : DEFAULT_THEME.fontFamily,
    headingFont: fontChoices.includes(input.headingFont) ? input.headingFont : DEFAULT_THEME.headingFont,
    fontSize: Math.max(12, Math.min(18, Number(input.fontSize) || DEFAULT_THEME.fontSize)),
    radius: Math.max(8, Math.min(22, Number(input.radius) || DEFAULT_THEME.radius)),
    sidebarWidth: Math.max(220, Math.min(340, Number(input.sidebarWidth) || DEFAULT_THEME.sidebarWidth)),
    contentWidth: Math.max(1100, Math.min(1800, Number(input.contentWidth) || DEFAULT_THEME.contentWidth)),
    spacing: ['compact', 'comfortable', 'spacious'].includes(input.spacing) ? input.spacing : 'comfortable',
    gradient: { start: gradient.start, end: gradient.end, angle: Math.max(0, Math.min(360, Number(gradient.angle) || 135)) },
  };
}

function normalizePageDraft(input) {
  if (!input || !Array.isArray(input.sections) || input.sections.length > 20) throw new Error('Page layout must contain up to 20 sections.');
  const ids = new Set();
  const sections = input.sections.map((section, index) => {
    const id = String(section.id || `section-${index + 1}`).replace(/[^a-z0-9-]/gi, '').slice(0, 48);
    if (!id || ids.has(id)) throw new Error('Page section identifiers must be unique.');
    ids.add(id);
    return {
      id,
      title: String(section.title || '').trim().slice(0, 90),
      description: String(section.description || '').trim().slice(0, 320),
      visible: section.visible !== false,
      source: String(section.source || 'Custom section').slice(0, 140),
    };
  });
  return { version: 1, sections };
}

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });

  const [publishedTheme, draftTheme, themeHistory, layout, dashboard, pageDraft] = await Promise.all([
    getAdminConfig('theme:published', DEFAULT_THEME),
    getAdminConfig(userKey(session, 'theme:draft'), null),
    getAdminConfig('theme:history', []),
    getAdminConfig(userKey(session, 'layout'), {}),
    getAdminConfig(userKey(session, 'dashboard'), {}),
    getAdminConfig('page-builder:draft', DEFAULT_PAGE_DRAFT),
  ]);
  return NextResponse.json({ publishedTheme, draftTheme, themeHistory, layout, dashboard, pageDraft });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'valid JSON is required' }, { status: 400 }); }
  const action = String(body.action || '');
  const globalActions = ['theme:publish', 'theme:restore-default', 'page:save-draft', 'page:reset'];
  if (globalActions.includes(action) && !can(session, 'apps:manage')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'apps:manage') }, { status: 403 });
  }
  if (!globalActions.includes(action) && !can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view') }, { status: 403 });
  }

  try {
    let result;
    if (action === 'theme:save-draft') {
      result = await setAdminConfig(userKey(session, 'theme:draft'), normalizeTheme(body.theme));
    } else if (action === 'theme:publish') {
      const theme = normalizeTheme(body.theme);
      const history = await getAdminConfig('theme:history', []);
      const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), actor: session.email, name: theme.name, theme };
      await setAdminConfig('theme:published', theme);
      await deleteAdminConfig(userKey(session, 'theme:draft'));
      result = await setAdminConfig('theme:history', [entry, ...history].slice(0, 25));
      await audit({ action: 'theme.published', actor: session.email, target: theme.name, result: 'success' });
    } else if (action === 'theme:revert') {
      await deleteAdminConfig(userKey(session, 'theme:draft'));
      result = await getAdminConfig('theme:published', DEFAULT_THEME);
    } else if (action === 'theme:restore-default') {
      const history = await getAdminConfig('theme:history', []);
      const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), actor: session.email, name: DEFAULT_THEME.name, theme: DEFAULT_THEME };
      await setAdminConfig('theme:published', DEFAULT_THEME);
      await deleteAdminConfig(userKey(session, 'theme:draft'));
      result = await setAdminConfig('theme:history', [entry, ...history].slice(0, 25));
      await audit({ action: 'theme.restored_default', actor: session.email, target: DEFAULT_THEME.name, result: 'success' });
    } else if (action === 'layout:save') {
      const layout = body.layout || {};
      result = await setAdminConfig(userKey(session, 'layout'), {
        sidebarWidth: Math.max(220, Math.min(340, Number(layout.sidebarWidth) || 264)),
        sidebarSide: layout.sidebarSide === 'right' ? 'right' : 'left',
        sidebarCollapsed: Boolean(layout.sidebarCollapsed),
        headerPosition: ['sticky', 'static'].includes(layout.headerPosition) ? layout.headerPosition : 'sticky',
        density: ['compact', 'comfortable', 'spacious'].includes(layout.density) ? layout.density : 'comfortable',
        navOrder: Array.isArray(layout.navOrder) ? [...new Set(layout.navOrder.filter((x) => NAV_PATHS.has(x)))].slice(0, NAV_PATHS.size) : [],
        hiddenNav: Array.isArray(layout.hiddenNav) ? [...new Set(layout.hiddenNav.filter((x) => NAV_PATHS.has(x)))].slice(0, NAV_PATHS.size) : [],
        pinnedNav: Array.isArray(layout.pinnedNav) ? [...new Set(layout.pinnedNav.filter((x) => NAV_PATHS.has(x)))].slice(0, NAV_PATHS.size) : [],
      });
      await audit({ action: 'layout.saved', actor: session.email, target: 'personal layout', result: 'success' });
    } else if (action === 'dashboard:save') {
      const dashboard = body.dashboard || {};
      const widgetSizes = {};
      for (const [id, size] of Object.entries(dashboard.widgetSizes || {})) {
        if (WIDGET_IDS.has(id) && ['4', '6', '12'].includes(String(size))) widgetSizes[id] = String(size);
      }
      result = await setAdminConfig(userKey(session, 'dashboard'), {
        hiddenWidgets: Array.isArray(dashboard.hiddenWidgets) ? [...new Set(dashboard.hiddenWidgets.filter((x) => WIDGET_IDS.has(x)))].slice(0, WIDGET_IDS.size) : [],
        widgetOrder: Array.isArray(dashboard.widgetOrder) ? [...new Set(dashboard.widgetOrder.filter((x) => WIDGET_IDS.has(x)))].slice(0, WIDGET_IDS.size) : [],
        widgetSizes,
        refreshSeconds: Math.max(0, Math.min(3600, Number(dashboard.refreshSeconds) || 0)),
      });
    } else if (action === 'page:save-draft') {
      result = await setAdminConfig('page-builder:draft', normalizePageDraft(body.pageDraft));
      await audit({ action: 'page_builder.draft_saved', actor: session.email, target: 'PlayBeat Digital storefront layout', result: 'success' });
    } else if (action === 'page:reset') {
      result = await setAdminConfig('page-builder:draft', DEFAULT_PAGE_DRAFT);
      await audit({ action: 'page_builder.draft_reset', actor: session.email, target: 'PlayBeat Digital storefront layout', result: 'success' });
    } else {
      return NextResponse.json({ error: 'unsupported action' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to save settings' }, { status: 400 });
  }
}
