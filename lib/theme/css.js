// ============================================================
// Token → CSS custom property projection.
//
// Pure functions, shared by the server (for a render-time no-flash script) and
// the browser (ThemeProvider). No secrets, no I/O.
//
// The output covers TWO namespaces:
//   --bs-*    Bootstrap 5.3 variables, so stock Bootstrap components follow the
//             theme without patching Bootstrap itself.
//   --pb-*    PlayBeat component variables used by app/globals.css.
// ============================================================
import { DEFAULT_TOKENS, ELEVATION, FONT_STACKS, gradientCss, sanitizeCustomCss } from './schema';

export function fontStack(idOrStack) {
  if (!idOrStack) return FONT_STACKS[0].stack;
  const known = FONT_STACKS.find((f) => f.id === idOrStack);
  if (known) return known.stack;
  // Allow a raw stack for uploaded/licensed fonts.
  return String(idOrStack).slice(0, 200);
}

export function resolvedMode(tokens) {
  const mode = tokens?.meta?.mode || 'dark';
  if (mode === 'auto') return 'auto';
  return mode === 'light' ? 'light' : 'dark';
}

export function tokensToVars(tokensInput, { forLight = false } = {}) {
  const t = tokensInput || DEFAULT_TOKENS;
  const c = t.colors || {};
  const g = t.gradients || {};
  const ty = t.typography || {};
  const l = t.layout || {};
  const cd = t.cards || {};
  const tb = t.tables || {};
  const bt = t.buttons || {};
  const fm = t.forms || {};
  const ch = t.charts || {};
  const ic = t.icons || {};
  const an = t.animations || {};
  const rs = t.responsive || {};
  const br = t.branding || {};
  const radius = Number.isFinite(t.meta?.radiusBase) ? t.meta.radiusBase : 14;

  const overlay = c.overlay || '#040812';
  const overlayOpacity = Number.isFinite(c.overlayOpacity) ? c.overlayOpacity : 0.6;
  const shadow = ELEVATION[cd.shadow] || ELEVATION.soft;
  const speed = an.speed === 'fast' ? 0.6 : an.speed === 'slow' ? 1.8 : 1;
  const duration = Math.round((Number.isFinite(an.durationMs) ? an.durationMs : 180) * (an.enabled ? speed : 0));

  const v = {
    /* ---------- Bootstrap surface + text ---------- */
    '--bs-body-bg': c.bg,
    '--bs-body-color': c.text,
    '--bs-emphasis-color': c.text,
    '--bs-secondary-color': c.textMuted,
    '--bs-tertiary-bg': c.bgElevated,
    '--bs-border-color': c.border,
    '--bs-border-color-translucent': c.border,
    '--bs-primary': c.accent,
    '--bs-primary-rgb': hexToRgbTriplet(c.accent),
    '--bs-link-color': c.link || c.accent,
    '--bs-link-hover-color': c.linkHover || c.accentStrong,
    '--bs-success': c.success,
    '--bs-warning': c.warning,
    '--bs-danger': c.danger,
    '--bs-info': c.info,
    '--bs-body-font-family': fontStack(ty.fontBody),
    '--bs-body-font-size': `${ty.baseSize || 15}px`,
    '--bs-body-line-height': String(ty.lineHeight || 1.55),
    '--bs-border-radius': `${fm.inputRadius ?? radius}px`,
    '--bs-border-radius-sm': `${Math.max(0, (fm.inputRadius ?? radius) - 4)}px`,
    '--bs-border-radius-lg': `${(cd.radius ?? radius + 2)}px`,

    /* ---------- PlayBeat core ---------- */
    '--pb-bg': c.bg,
    '--pb-bg-elevated': c.bgElevated,
    '--pb-bg-inset': c.bgInset,
    '--pb-card-bg': c.cardBg,
    '--pb-card-head-bg': c.cardHeadBg,
    '--pb-card-gradient': cd.bgStyle === 'gradient'
      ? gradientCss(g.card, c.cardBg, c.cardHeadBg)
      : 'none',
    '--pb-sidebar-bg': c.sidebarBg,
    '--pb-sidebar-gradient': g.sidebar?.enabled
      ? gradientCss(g.sidebar, c.sidebarBg, c.bg)
      : 'none',
    '--pb-nav-bg': c.navBg,
    '--pb-topbar-bg': c.topbarBg,
    '--pb-line': c.border,
    '--pb-line-strong': c.borderStrong,
    '--pb-text': c.text,
    '--pb-text-muted': c.textMuted,
    '--pb-hover': c.hover,
    '--pb-overlay': overlay,
    '--pb-overlay-rgba': `rgba(${hexToRgbTriplet(overlay)},${overlayOpacity})`,
    '--pb-accent': c.accent,
    '--pb-accent-strong': c.accentStrong || c.accent,
    '--pb-accent-soft': c.accentSoft,
    '--pb-accent-rgb': hexToRgbTriplet(c.accent),
    '--pb-accent-gradient': g.accent?.enabled
      ? gradientCss(g.accent, c.accent, c.highlight)
      : `linear-gradient(0deg, ${c.accent}, ${c.accent})`,
    '--pb-secondary-accent': c.secondaryAccent,
    '--pb-highlight': c.highlight,
    '--pb-success': c.success,
    '--pb-warning': c.warning,
    '--pb-danger': c.danger,
    '--pb-info': c.info,
    '--pb-link': c.link || c.accent,
    '--pb-login-bg': g.login?.enabled ? gradientCss(g.login, c.bg, c.bgElevated) : c.bg,

    /* ---------- radius / spacing / elevation ---------- */
    '--pb-radius': `${radius}px`,
    '--pb-radius-sm': `${Math.max(0, radius - 6)}px`,
    '--pb-radius-lg': `${radius + 4}px`,
    '--pb-shadow-1': ELEVATION.soft,
    '--pb-shadow-2': ELEVATION.medium,
    '--pb-shadow-3': ELEVATION.strong,
    '--pb-card-shadow': shadow,
    '--pb-card-border-width': `${cd.borderWidth ?? 1}px`,
    '--pb-card-pad': `${cd.padding ?? 20}px`,
    '--pb-card-head-align': cd.headerAlign || 'left',
    '--pb-card-hover-lift': cd.hoverLift === false ? '0px' : '-2px',
    '--pb-kpi-size': `${cd.valueSize ?? 26}px`,
    '--pb-kpi-weight': String(cd.valueWeight ?? 700),
    '--pb-gap': `${l.cardGap ?? 16}px`,
    '--pb-page-pad': `${l.pagePadding ?? 24}px`,
    '--pb-content-max': l.contentLayout === 'container' ? `${l.contentWidth ?? 1440}px` : '100%',
    '--pb-sidebar-w': `${l.sidebarWidth ?? 268}px`,
    '--pb-sidebar-w-collapsed': `${l.sidebarCollapsedWidth ?? 76}px`,
    '--pb-topbar-h': `${l.topbarHeight ?? 60}px`,
    '--pb-density-row': l.gridDensity === 'compact' ? '0.35rem' : l.gridDensity === 'spacious' ? '0.95rem' : '0.6rem',

    /* ---------- typography detail ---------- */
    '--pb-font-heading': fontStack(ty.fontHeading),
    '--pb-font-body': fontStack(ty.fontBody),
    '--pb-font-mono': fontStack(ty.fontMono),
    '--pb-base-size': `${ty.baseSize || 15}px`,
    '--pb-heading-weight': String(ty.headingWeight ?? 650),
    '--pb-body-weight': String(ty.bodyWeight ?? 400),
    '--pb-heading-tracking': `${ty.headingLetterSpacing ?? 0}em`,
    '--pb-body-tracking': `${ty.letterSpacing ?? 0}em`,
    '--pb-nav-size': `${ty.navSize ?? 13.5}px`,
    '--pb-nav-weight': String(ty.navWeight ?? 500),
    '--pb-table-size': `${ty.tableSize ?? 13}px`,
    '--pb-table-header-size': `${ty.tableHeaderSize ?? 10.5}px`,
    '--pb-btn-size': `${ty.buttonSize ?? 13}px`,
    '--pb-btn-weight': String(ty.buttonWeight ?? 600),
    '--pb-label-size': `${ty.labelSize ?? 10.5}px`,
    '--pb-label-weight': String(ty.labelWeight ?? 600),
    '--pb-label-transform': ty.labelTransform || 'uppercase',

    /* ---------- tables ---------- */
    '--pb-table-head-bg': tb.headerBg,
    '--pb-table-head-color': tb.headerColor,
    '--pb-table-hover': tb.rowHover,
    '--pb-table-border': `${tb.borderWidth ?? 1}px`,
    '--pb-table-size-custom': `${tb.fontsize ?? 13}px`,
    '--pb-chip-radius': `${tb.chipRadius ?? 999}px`,
    '--pb-row-pad': tb.density === 'compact' ? '0.35rem' : tb.density === 'relaxed' ? '0.95rem' : '0.6rem',

    /* ---------- buttons / forms ---------- */
    '--pb-btn-radius': `${bt.radius ?? 10}px`,
    '--pb-btn-px': `${bt.paddingX ?? 16}px`,
    '--pb-btn-py': `${bt.paddingY ?? 8}px`,
    '--pb-btn-transform': bt.uppercase ? 'uppercase' : 'none',
    '--pb-btn-shadow': bt.shadow === 'medium' ? ELEVATION.medium : bt.shadow === 'soft' ? ELEVATION.soft : 'none',
    '--pb-input-bg': fm.inputBg,
    '--pb-input-border': fm.inputBorder,
    '--pb-input-radius': `${fm.inputRadius ?? 10}px`,
    '--pb-control-h': `${fm.controlHeight ?? 40}px`,
    '--pb-label-color': fm.helperColor,
    '--pb-focus-ring': `rgba(${hexToRgbTriplet(fm.focusRing || c.accent)},${fm.focusRingOpacity ?? 0.25})`,

    /* ---------- charts / icons / motion ---------- */
    '--pb-chart-1': ch.palette?.[0] || c.accent,
    '--pb-chart-2': ch.palette?.[1] || c.success,
    '--pb-chart-3': ch.palette?.[2] || c.highlight,
    '--pb-chart-4': ch.palette?.[3] || c.secondaryAccent,
    '--pb-chart-5': ch.palette?.[4] || c.danger,
    '--pb-chart-6': ch.palette?.[5] || c.info,
    '--pb-chart-grid': ch.gridColor,
    '--pb-chart-axis': ch.axisColor,
    '--pb-chart-line': String(ch.lineWidth ?? 2),
    '--pb-chart-area': String(ch.areaOpacity ?? 0.18),
    '--pb-chart-bar-radius': `${ch.barRadius ?? 6}px`,
    '--pb-chart-donut': String(ch.donutThickness ?? 22),
    '--pb-chart-anim': `${ch.animationMs ?? 420}ms`,
    '--pb-icon-size': `${ic.size ?? 18}px`,
    '--pb-anim-duration': `${duration}ms`,
    '--pb-anim-ease': 'cubic-bezier(.4,0,.2,1)',

    /* ---------- responsive ---------- */
    '--pb-breakpoint-lg': `${rs.breakpointLg ?? 992}px`,
    '--pb-brand': br.brandName || 'PlayBeat Digital',
  };

  // Drop undefined so we never write the literal string "undefined" into CSS.
  for (const key of Object.keys(v)) {
    if (v[key] === undefined || v[key] === null || v[key] === '') delete v[key];
  }
  return v;
}

function hexToRgbTriplet(hex) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  const n = parseInt(full.padEnd(6, '0'), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}

/** Serialize the vars into a `:root{...}` block for SSR / no-flash injection. */
export function varsToCss(vars, selector = ':root') {
  const body = Object.entries(vars).map(([k, val]) => `${k}:${val};`).join('');
  return `${selector}{${body}}`;
}

export function customCssBlock(css) {
  const clean = sanitizeCustomCss(css);
  return clean ? `/* admin custom css */\n${clean}` : '';
}

/**
 * Full stylesheet string for a token set — used for the no-flash inline <style>
 * on first paint and for the "export theme as CSS" action.
 */
export function tokensToStylesheet(tokens, { includeCustom = true } = {}) {
  const mode = resolvedMode(tokens);
  const darkTokens = mode === 'light' ? { ...tokens, colors: lightVariant(tokens) } : tokens;
  const parts = [varsToCss(tokensToVars(tokens), ':root')];
  if (mode === 'auto') {
    parts.push(`@media (prefers-color-scheme: light){${varsToCss(tokensToVars(darkTokens), ':root')}}`);
  }
  if (includeCustom) parts.push(customCssBlock(tokens?.custom?.css));
  return parts.join('\n');
}

/**
 * For 'auto' mode we render the dark block as the base and a light override.
 * A light-mode preset already carries its own light palette, so this is only a
 * fallback for custom themes that did not define one.
 */
function lightVariant(tokens) {
  return {
    ...(tokens.colors || {}),
    bg: '#F5F7FB', bgElevated: '#FFFFFF', bgInset: '#EDF1F7',
    cardBg: '#FFFFFF', cardHeadBg: '#FAFBFD',
    border: '#DFE5EE', borderStrong: '#C3CCDA',
    text: '#16233B', textMuted: '#5C6B82',
    hover: '#EDF2FA',
  };
}

/**
 * The tiny inline script that paints the published theme before React hydrates,
 * so there is no flash of the wrong colours. It reads a cache the admin shell
 * writes on every load; the cache holds cosmetics only — never credentials.
 */
export const NO_FLASH_SCRIPT = `
(function(){
  try{
    var raw = localStorage.getItem('pb_theme_cache');
    if(!raw) return;
    var t = JSON.parse(raw);
    var vars = t.vars || {};
    var root = document.documentElement;
    for (var k in vars){ if(Object.prototype.hasOwnProperty.call(vars,k)) root.style.setProperty(k, vars[k]); }
    if (t.mode) root.setAttribute('data-bs-theme', t.mode);
    if (t.css){ var s = document.getElementById('pb-custom-css') || document.createElement('style'); s.id='pb-custom-css'; s.textContent = t.css; document.head.appendChild(s); }
  }catch(e){}
})();
`.trim();
