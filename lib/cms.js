// ============================================================
// CMS document model — pages, navigation, home sections and SEO metadata.
//
// The section vocabulary here is shared by the Website CMS form editor and the
// Visual Page Builder, so both write the SAME document shape and either one can
// be used to change the storefront.
// ============================================================
import { sanitizeCustomCss } from './theme/schema';

export const SECTION_TYPES = [
  { type: 'hero', label: 'Hero banner', icon: 'bi-easel', fields: ['eyebrow', 'title', 'subtitle', 'ctaLabel', 'ctaHref', 'imageUrl', 'align'] },
  { type: 'features', label: 'Feature grid', icon: 'bi-grid-3x3-gap', fields: ['title', 'items'] },
  { type: 'products', label: 'Product grid', icon: 'bi-box-seam', fields: ['title', 'source', 'limit', 'columns'] },
  { type: 'categories', label: 'Category section', icon: 'bi-diagram-2', fields: ['title', 'items'] },
  { type: 'promo', label: 'Promotional banner', icon: 'bi-megaphone', fields: ['title', 'body', 'ctaLabel', 'ctaHref', 'tone'] },
  { type: 'slider', label: 'Slider / carousel', icon: 'bi-collection', fields: ['title', 'autoplay', 'intervalMs', 'items'] },
  { type: 'testimonials', label: 'Testimonials', icon: 'bi-chat-quote', fields: ['title', 'items'] },
  { type: 'faq', label: 'FAQ', icon: 'bi-question-circle', fields: ['title', 'items'] },
  { type: 'cta', label: 'Call to action', icon: 'bi-cursor', fields: ['title', 'body', 'ctaLabel', 'ctaHref'] },
  { type: 'footer', label: 'Footer', icon: 'bi-layout-text-window-reverse', fields: ['columns', 'social', 'legal'] },
  { type: 'html', label: 'Custom HTML block', icon: 'bi-code-square', fields: ['html'] },
];

export const SECTION_TYPE_MAP = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s]));

export const DEFAULT_CMS_DOCUMENT = {
  site: {
    title: 'PlayBeat Digital',
    tagline: 'Premium beats, samples and production tools',
    defaultDescription: 'PlayBeat Digital — producer-grade beat packs, sample kits, MIDI packs and subscriptions.',
    locale: 'en',
    canonical: 'https://playbeat.digital',
  },
  navigation: {
    items: [
      { label: 'Beats', href: '/beats' },
      { label: 'Samples', href: '/samples' },
      { label: 'Subscriptions', href: '/pricing' },
      { label: 'Services', href: '/services' },
      { label: 'Support', href: '/support' },
    ],
    ctaLabel: 'Sign in',
    ctaHref: '/signin',
  },
  seo: {
    title: 'PlayBeat Digital — Producer-grade beats & sample packs',
    description: 'Download licensed beat packs, sample kits and MIDI packs. Studio-ready, royalty-documented.',
    keywords: 'beats, sample packs, midi packs, music production, royalty free',
    ogImage: '',
    robots: 'index,follow',
    sitemap: true,
  },
  footer: {
    columns: [
      { title: 'Store', links: [{ label: 'Beats', href: '/beats' }, { label: 'Samples', href: '/samples' }] },
      { title: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }] },
      { title: 'Legal', links: [{ label: 'Licence', href: '/licence' }, { label: 'Privacy', href: '/privacy' }] },
    ],
    legal: '© PlayBeat Digital. All rights reserved.',
  },
  sections: [
    {
      id: 'sec-hero',
      type: 'hero',
      enabled: true,
      eyebrow: 'New this week',
      title: 'Producer-grade beats, licensed and documented',
      subtitle: 'Instant delivery with a clear royalty trail for every download.',
      ctaLabel: 'Browse the catalog',
      ctaHref: '/beats',
      imageUrl: '',
      align: 'left',
    },
    {
      id: 'sec-features',
      type: 'features',
      enabled: true,
      title: 'Why producers choose PlayBeat',
      items: [
        { title: 'Licence clarity', body: 'Every pack ships with a documented licence scope.' },
        { title: 'Instant fulfilment', body: 'Automated delivery the moment payment clears.' },
        { title: 'Studio-ready stems', body: 'WAV, MIDI and session files in one download.' },
      ],
    },
    {
      id: 'sec-products',
      type: 'products',
      enabled: true,
      title: 'Featured packs',
      source: 'playbeat-digital',
      limit: 8,
      columns: 4,
    },
    {
      id: 'sec-faq',
      type: 'faq',
      enabled: false,
      title: 'Frequently asked questions',
      items: [
        { title: 'What licence do I get?', body: 'Lease and exclusive options are listed on each product page.' },
      ],
    },
  ],
  customCss: '',
};

/* ------------------------------ normalization ------------------------------ */

const str = (v, max = 600) => (v === undefined || v === null ? '' : String(v).slice(0, max));
const bool = (v, fallback = true) => (typeof v === 'boolean' ? v : fallback);
const int = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

function normaliseItems(items, shape) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 24).map((item, i) => {
    if (shape === 'link') return { label: str(item?.label, 80), href: str(item?.href, 300) };
    if (shape === 'card') return { title: str(item?.title, 120), body: str(item?.body, 400), icon: str(item?.icon, 60) };
    if (shape === 'faq') return { title: str(item?.title, 200), body: str(item?.body, 1200) };
    if (shape === 'quote') return { quote: str(item?.quote, 600), author: str(item?.author, 120), role: str(item?.role, 120) };
    if (shape === 'slide') return { title: str(item?.title, 140), body: str(item?.body, 400), imageUrl: str(item?.imageUrl, 500), href: str(item?.href, 300), id: str(item?.id, 40) || `slide-${i}` };
    if (shape === 'column') return { title: str(item?.title, 80), links: normaliseItems(item?.links, 'link') };
    if (shape === 'category') return { label: str(item?.label, 80), href: str(item?.href, 300), imageUrl: str(item?.imageUrl, 500), count: int(item?.count, 0, 9999, 0) };
    return { title: str(item?.title, 140), body: str(item?.body, 400) };
  });
}

const ITEM_SHAPE = {
  features: 'card',
  categories: 'category',
  faq: 'faq',
  testimonials: 'quote',
  slider: 'slide',
};

/** Whitelist + coerce one section against its declared type. */
export function normalizeSection(input, index = 0) {
  const spec = SECTION_TYPE_MAP[input?.type] || SECTION_TYPE_MAP.hero;
  const out = {
    id: str(input?.id, 40) || `sec-${spec.type}-${index}`,
    type: spec.type,
    enabled: bool(input?.enabled, true),
  };
  const src = input || {};

  switch (spec.type) {
    case 'hero':
      Object.assign(out, {
        eyebrow: str(src.eyebrow, 80),
        title: str(src.title, 200),
        subtitle: str(src.subtitle, 400),
        ctaLabel: str(src.ctaLabel, 60),
        ctaHref: str(src.ctaHref, 300),
        imageUrl: str(src.imageUrl, 500),
        align: ['left', 'center', 'right'].includes(src.align) ? src.align : 'left',
      });
      break;
    case 'features':
    case 'categories':
    case 'faq':
    case 'testimonials':
    case 'slider':
      out.title = str(src.title, 200);
      out.items = normaliseItems(src.items, ITEM_SHAPE[spec.type]);
      if (spec.type === 'slider') {
        out.autoplay = bool(src.autoplay, true);
        out.intervalMs = int(src.intervalMs, 1500, 20000, 5000);
      }
      break;
    case 'products':
      out.title = str(src.title, 200);
      out.source = str(src.source, 60) || 'playbeat-digital';
      out.limit = int(src.limit, 1, 24, 8);
      out.columns = int(src.columns, 1, 6, 4);
      break;
    case 'promo':
    case 'cta':
      out.title = str(src.title, 200);
      out.body = str(src.body, 600);
      out.ctaLabel = str(src.ctaLabel, 60);
      out.ctaHref = str(src.ctaHref, 300);
      if (spec.type === 'promo') out.tone = ['accent', 'neutral', 'success', 'warning'].includes(src.tone) ? src.tone : 'accent';
      break;
    case 'footer':
      out.columns = normaliseItems(src.columns, 'column');
      out.legal = str(src.legal, 300);
      break;
    case 'html':
      // Script tags and event handlers are stripped: an editor cannot inject JS.
      out.html = str(src.html, 8000)
        .replace(/<\/?script[^>]*>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript\s*:/gi, '');
      break;
    default:
      out.title = str(src.title, 200);
  }
  return out;
}

export function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.slice(0, 60).map((s, i) => normalizeSection(s, i));
}

export function normalizeCmsDocument(input, fallback = DEFAULT_CMS_DOCUMENT) {
  const src = input && typeof input === 'object' ? input : {};
  const site = src.site || {};
  const nav = src.navigation || {};
  const seo = src.seo || {};
  const footer = src.footer || {};
  return {
    site: {
      title: str(site.title, 120) || fallback.site.title,
      tagline: str(site.tagline, 200),
      defaultDescription: str(site.defaultDescription, 400),
      locale: str(site.locale, 10) || 'en',
      canonical: str(site.canonical, 300),
    },
    navigation: {
      items: normaliseItems(nav.items, 'link').slice(0, 20),
      ctaLabel: str(nav.ctaLabel, 60),
      ctaHref: str(nav.ctaHref, 300),
    },
    seo: {
      title: str(seo.title, 200),
      description: str(seo.description, 400),
      keywords: str(seo.keywords, 300),
      ogImage: str(seo.ogImage, 500),
      robots: ['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'].includes(seo.robots) ? seo.robots : 'index,follow',
      sitemap: bool(seo.sitemap, true),
    },
    footer: {
      columns: normaliseItems(footer.columns, 'column').slice(0, 6),
      legal: str(footer.legal, 300),
    },
    sections: normalizeSections(src.sections || fallback.sections),
    customCss: sanitizeCustomCss(str(src.customCss, 20000)),
  };
}

export function newSectionId(type) {
  return `sec-${type}-${Date.now().toString(36)}`;
}
