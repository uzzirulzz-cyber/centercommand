// ============================================================
// Design-token schema — the single source of truth for the Theme Studio.
//
// WHY CSS CUSTOM PROPERTIES AND NOT COMPILED SCSS:
// the brief requires every visual setting to be changeable from the admin
// dashboard "without manually editing CSS" and to preview live. Compiled SCSS
// variables are frozen at build time and cannot do that. So the token set below
// is the source of truth, it is applied at runtime as CSS custom properties
// (lib/theme/css.js), and a mirror SCSS file (styles/_tokens.scss) is provided
// for teams that additionally want compile-time access.
//
// Every field is schema-driven: the Properties Inspector renders itself from
// GROUPS, so adding a control is a one-line change here.
// ============================================================

export const MODES = ['dark', 'light', 'auto'];

export const FONT_STACKS = [
  { id: 'inter', label: 'Inter (OFL)', stack: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
  { id: 'manrope', label: 'Manrope (OFL)', stack: "'Manrope', 'Inter', system-ui, sans-serif" },
  { id: 'dm-sans', label: 'DM Sans (OFL)', stack: "'DM Sans', 'Inter', system-ui, sans-serif" },
  { id: 'system', label: 'System UI', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { id: 'georgia', label: 'Georgia (serif)', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Monospace / data', stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
];

export const DEFAULT_TOKENS = {
  meta: { name: 'Wealth Bloom', presetId: 'wealth-bloom', mode: 'light', radiusBase: 14, elevation: 'soft' },

  colors: {
    bg: '#f5f6fb',
    bgElevated: '#ffffff',
    bgInset: '#eef0f7',
    cardBg: '#ffffff',
    cardHeadBg: '#fafaff',
    sidebarBg: '#ffffff',
    topbarBg: 'rgba(255,255,255,.92)',
    navBg: '#ffffff',
    border: '#e6e8f0',
    borderStrong: '#d6d9e5',
    text: '#24263b',
    textMuted: '#667085',
    textInverse: '#ffffff',
    accent: '#6259c8',
    accentStrong: '#5148b3',
    accentSoft: '#f0efff',
    secondaryAccent: '#8581a5',
    highlight: '#e6a43b',
    success: '#15966b',
    warning: '#b7791f',
    danger: '#d94b62',
    info: '#3588c9',
    link: '#5148b3',
    linkHover: '#39318f',
    hover: '#f4f3fb',
    overlay: '#1e1b38',
    overlayOpacity: 0.42,
  },

  gradients: {
    accent: { from: '#6259c8', to: '#8979e8', angle: 135, enabled: true },
    sidebar: { from: '#ffffff', to: '#f5f6fb', angle: 180, enabled: false },
    card: { from: '#ffffff', to: '#fafaff', angle: 160, enabled: false },
    login: { from: '#f5f6fb', to: '#ffffff', angle: 135, enabled: true },
  },

  typography: {
    fontBody: 'inter',
    fontHeading: 'inter',
    fontMono: 'mono',
    baseSize: 15,
    scale: 1.2,
    bodyWeight: 400,
    headingWeight: 650,
    lineHeight: 1.55,
    letterSpacing: 0,
    headingLetterSpacing: -0.01,
    navSize: 13.5,
    navWeight: 500,
    tableSize: 13,
    tableHeaderSize: 10.5,
    buttonSize: 13,
    buttonWeight: 600,
    labelSize: 10.5,
    labelWeight: 600,
    labelTransform: 'uppercase',
  },

  layout: {
    sidebarWidth: 268,
    sidebarCollapsedWidth: 76,
    sidebarPosition: 'left',
    sidebarMode: 'expanded',
    sidebarFixed: true,
    logoMode: 'full',
    menuGrouping: true,
    menuCollapsible: true,
    activeStyle: 'rail',
    indicatorShape: 'rounded',
    topbarPosition: 'sticky',
    topbarHeight: 60,
    showSearch: true,
    showBreadcrumbs: true,
    notificationPosition: 'right',
    profileStyle: 'dropdown',
    quickActions: true,
    workspaceSelector: true,
    workspacePlacement: 'left',
    contentLayout: 'fluid',
    contentWidth: 1440,
    gridDensity: 'comfortable',
    cardGap: 16,
    pagePadding: 24,
  },

  cards: {
    radius: 16,
    shadow: 'medium',
    borderWidth: 1,
    padding: 20,
    headerAlign: 'left',
    hoverLift: true,
    bgStyle: 'solid',
    valueSize: 26,
    valueWeight: 700,
    iconStyle: 'soft',
  },

  tables: {
    headerBg: '#0E1A2C',
    headerColor: '#98AAC3',
    rowHover: '#162440',
    stripe: false,
    density: 'normal',
    borderWidth: 1,
    fontsize: 13,
    chipRadius: 999,
    stickyHeader: true,
  },

  buttons: {
    radius: 10,
    paddingX: 16,
    paddingY: 8,
    weight: 600,
    uppercase: false,
    shadow: 'none',
    variant: 'soft',
    transitionMs: 180,
  },

  forms: {
    inputBg: '#0E1A2C',
    inputBorder: '#1E2C44',
    inputRadius: 10,
    labelWeight: 600,
    helperColor: '#7E90AA',
    controlHeight: 40,
    focusRing: '#397BFF',
    focusRingOpacity: 0.25,
  },

  charts: {
    palette: ['#397BFF', '#15B88A', '#F0B75E', '#A87BFF', '#EC5D70', '#4FB6E8'],
    gridColor: '#1B2942',
    axisColor: '#7E90AA',
    lineWidth: 2,
    areaOpacity: 0.18,
    barRadius: 6,
    donutThickness: 22,
    animationMs: 420,
    legendPosition: 'bottom',
  },

  icons: {
    library: 'bootstrap',
    size: 18,
    style: 'outline',
  },

  animations: {
    enabled: true,
    speed: 'normal',
    durationMs: 180,
    hoverLift: true,
    pageTransition: 'fade',
    respectReducedMotion: true,
  },

  responsive: {
    breakpointLg: 992,
    mobileSidebar: 'offcanvas',
    tableMode: 'scroll',
    compactMobile: true,
    hideSidebarLabels: true,
  },

  branding: {
    brandName: 'PlayBeat Digital',
    brandShort: 'PlayBeat',
    subtitle: 'Central Administration',
    logoText: '▶',
    logoUrl: '',
    logoCompactUrl: '',
    workspaceName: 'PlayBeat Holdings',
    workspaceOptions: ['PlayBeat Holdings', 'PlayBeat Digital', 'PlayBeat Live', 'MagXTV', 'MakeThisDeal'],
    footerText: '© PlayBeat Digital',
    supportEmail: 'support@playbeat.digital',
    showVersionBadge: true,
  },

  custom: { css: '' },
};

export const ELEVATION = {
  none: 'none',
  soft: '0 1px 2px rgba(2,8,20,.18)',
  medium: '0 6px 20px rgba(2,8,20,.28)',
  strong: '0 14px 40px rgba(2,8,20,.38)',
};

export const SPACING_STEPS = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

/* ------------------------------------------------------------------ */
/* Schema-driven control groups (left column of the Theme Studio)      */
/* field.type: color | number | range | text | select | toggle | font  */
/*           | gradient | palette | css | textarea                      */
/* ------------------------------------------------------------------ */
export const GROUPS = [
  {
    id: 'presets',
    label: 'Theme Presets',
    icon: 'bi-palette2',
    fields: [],
  },
  {
    id: 'colors',
    label: 'Global Colors',
    icon: 'bi-droplet-half',
    fields: [
      { path: 'colors.bg', label: 'Primary background', type: 'color' },
      { path: 'colors.bgElevated', label: 'Elevated background', type: 'color' },
      { path: 'colors.bgInset', label: 'Inset background', type: 'color' },
      { path: 'colors.accent', label: 'Primary accent', type: 'color' },
      { path: 'colors.accentStrong', label: 'Accent (hover/press)', type: 'color' },
      { path: 'colors.accentSoft', label: 'Accent (soft fill)', type: 'color' },
      { path: 'colors.secondaryAccent', label: 'Secondary accent', type: 'color' },
      { path: 'colors.highlight', label: 'Premium highlight', type: 'color' },
      { path: 'colors.text', label: 'Main text', type: 'color' },
      { path: 'colors.textMuted', label: 'Muted text', type: 'color' },
      { path: 'colors.textInverse', label: 'Text on accent', type: 'color' },
      { path: 'colors.border', label: 'Border', type: 'color' },
      { path: 'colors.borderStrong', label: 'Border (strong)', type: 'color' },
      { path: 'colors.hover', label: 'Hover surface', type: 'color' },
      { path: 'colors.link', label: 'Link', type: 'color' },
      { path: 'colors.linkHover', label: 'Link (hover)', type: 'color' },
      { path: 'colors.overlay', label: 'Overlay color', type: 'color' },
      { path: 'colors.overlayOpacity', label: 'Overlay opacity', type: 'range', min: 0, max: 1, step: 0.02 },
      { path: 'colors.success', label: 'Success', type: 'color' },
      { path: 'colors.warning', label: 'Warning', type: 'color' },
      { path: 'colors.danger', label: 'Danger', type: 'color' },
      { path: 'colors.info', label: 'Info', type: 'color' },
    ],
  },
  {
    id: 'backgrounds',
    label: 'Backgrounds',
    icon: 'bi-layers',
    fields: [
      { path: 'gradients.sidebar.enabled', label: 'Sidebar gradient', type: 'toggle' },
      { path: 'gradients.sidebar', label: 'Sidebar gradient', type: 'gradient' },
      { path: 'gradients.card.enabled', label: 'Card gradient', type: 'toggle' },
      { path: 'gradients.card', label: 'Card gradient', type: 'gradient' },
      { path: 'gradients.login.enabled', label: 'Login background gradient', type: 'toggle' },
      { path: 'gradients.login', label: 'Login gradient', type: 'gradient' },
      { path: 'gradients.accent.enabled', label: 'Accent gradient (brand marks, bars)', type: 'toggle' },
      { path: 'gradients.accent', label: 'Accent gradient', type: 'gradient' },
      { path: 'cards.bgStyle', label: 'Card surface style', type: 'select', options: ['solid', 'gradient', 'glass'] },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: 'bi-fonts',
    fields: [
      { path: 'typography.fontHeading', label: 'Heading font', type: 'font' },
      { path: 'typography.fontBody', label: 'Body font', type: 'font' },
      { path: 'typography.fontMono', label: 'Data / mono font', type: 'font' },
      { path: 'typography.baseSize', label: 'Base size (px)', type: 'range', min: 12, max: 20, step: 0.5 },
      { path: 'typography.scale', label: 'Heading scale', type: 'range', min: 1.05, max: 1.6, step: 0.01 },
      { path: 'typography.headingWeight', label: 'Heading weight', type: 'select', options: [400, 500, 600, 650, 700, 800] },
      { path: 'typography.bodyWeight', label: 'Body weight', type: 'select', options: [300, 400, 450, 500] },
      { path: 'typography.lineHeight', label: 'Line height', type: 'range', min: 1.2, max: 2, step: 0.05 },
      { path: 'typography.letterSpacing', label: 'Body letter spacing (em)', type: 'range', min: -0.02, max: 0.08, step: 0.002 },
      { path: 'typography.headingLetterSpacing', label: 'Heading letter spacing (em)', type: 'range', min: -0.05, max: 0.05, step: 0.002 },
      { path: 'typography.navSize', label: 'Navigation size (px)', type: 'range', min: 11, max: 18, step: 0.5 },
      { path: 'typography.navWeight', label: 'Navigation weight', type: 'select', options: [400, 500, 600, 700] },
      { path: 'typography.tableSize', label: 'Table size (px)', type: 'range', min: 11, max: 16, step: 0.5 },
      { path: 'typography.tableHeaderSize', label: 'Table header size (px)', type: 'range', min: 9, max: 14, step: 0.5 },
      { path: 'typography.buttonSize', label: 'Button size (px)', type: 'range', min: 11, max: 17, step: 0.5 },
      { path: 'typography.buttonWeight', label: 'Button weight', type: 'select', options: [400, 500, 600, 700] },
      { path: 'typography.labelSize', label: 'Label size (px)', type: 'range', min: 9, max: 14, step: 0.5 },
      { path: 'typography.labelWeight', label: 'Label weight', type: 'select', options: [400, 500, 600, 700] },
      { path: 'typography.labelTransform', label: 'Label transform', type: 'select', options: ['uppercase', 'capitalize', 'none'] },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    icon: 'bi-signpost-split',
    fields: [
      { path: 'layout.topbarPosition', label: 'Topbar position', type: 'select', options: ['fixed', 'sticky', 'static'] },
      { path: 'layout.topbarHeight', label: 'Topbar height (px)', type: 'range', min: 48, max: 84, step: 2 },
      { path: 'layout.showSearch', label: 'Universal search', type: 'toggle' },
      { path: 'layout.showBreadcrumbs', label: 'Breadcrumbs', type: 'toggle' },
      { path: 'layout.notificationPosition', label: 'Notifications anchored', type: 'select', options: ['left', 'right'] },
      { path: 'layout.profileStyle', label: 'Profile control', type: 'select', options: ['dropdown', 'button', 'avatar'] },
      { path: 'layout.quickActions', label: 'Quick-create menu', type: 'toggle' },
      { path: 'layout.workspaceSelector', label: 'Workspace selector', type: 'toggle' },
      { path: 'layout.workspacePlacement', label: 'Workspace placement', type: 'select', options: ['left', 'right'] },
      { path: 'icons.library', label: 'Icon library', type: 'select', options: ['bootstrap', 'unicode'] },
      { path: 'icons.size', label: 'Icon size (px)', type: 'range', min: 12, max: 26, step: 1 },
      { path: 'icons.style', label: 'Icon style', type: 'select', options: ['outline', 'solid'] },
    ],
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    icon: 'bi-layout-sidebar-inset',
    fields: [
      { path: 'layout.sidebarPosition', label: 'Position', type: 'select', options: ['left', 'right'] },
      { path: 'layout.sidebarMode', label: 'Default mode', type: 'select', options: ['expanded', 'collapsed', 'icon'] },
      { path: 'layout.sidebarFixed', label: 'Fixed (does not scroll away)', type: 'toggle' },
      { path: 'layout.sidebarWidth', label: 'Expanded width (px)', type: 'range', min: 220, max: 340, step: 2 },
      { path: 'layout.sidebarCollapsedWidth', label: 'Collapsed width (px)', type: 'range', min: 60, max: 110, step: 2 },
      { path: 'layout.logoMode', label: 'Logo mode', type: 'select', options: ['full', 'compact'] },
      { path: 'layout.menuGrouping', label: 'Menu section grouping', type: 'toggle' },
      { path: 'layout.menuCollapsible', label: 'Collapsible sections', type: 'toggle' },
      { path: 'layout.activeStyle', label: 'Active menu style', type: 'select', options: ['rail', 'pill', 'filled', 'underline'] },
      { path: 'layout.indicatorShape', label: 'Menu indicator shape', type: 'select', options: ['rounded', 'square'] },
      { path: 'colors.sidebarBg', label: 'Sidebar background', type: 'color' },
      { path: 'colors.navBg', label: 'Navigation background', type: 'color' },
    ],
  },
  {
    id: 'cards',
    label: 'Cards & Widgets',
    icon: 'bi-grid-1x2',
    fields: [
      { path: 'cards.radius', label: 'Corner radius (px)', type: 'range', min: 0, max: 28, step: 1 },
      { path: 'cards.shadow', label: 'Shadow depth', type: 'select', options: ['none', 'soft', 'medium', 'strong'] },
      { path: 'cards.borderWidth', label: 'Border thickness (px)', type: 'range', min: 0, max: 3, step: 1 },
      { path: 'cards.padding', label: 'Card padding (px)', type: 'range', min: 8, max: 40, step: 2 },
      { path: 'cards.headerAlign', label: 'Header positioning', type: 'select', options: ['left', 'center', 'right'] },
      { path: 'cards.hoverLift', label: 'Hover lift', type: 'toggle' },
      { path: 'cards.iconStyle', label: 'Icon treatment', type: 'select', options: ['soft', 'solid', 'outline', 'none'] },
      { path: 'cards.valueSize', label: 'KPI value size (px)', type: 'range', min: 16, max: 40, step: 1 },
      { path: 'cards.valueWeight', label: 'KPI value weight', type: 'select', options: [500, 600, 700, 800] },
      { path: 'colors.cardBg', label: 'Card background', type: 'color' },
      { path: 'colors.cardHeadBg', label: 'Card header background', type: 'color' },
    ],
  },
  {
    id: 'tables',
    label: 'Tables',
    icon: 'bi-table',
    fields: [
      { path: 'tables.headerBg', label: 'Header background', type: 'color' },
      { path: 'tables.headerColor', label: 'Header text', type: 'color' },
      { path: 'tables.rowHover', label: 'Row hover', type: 'color' },
      { path: 'tables.stripe', label: 'Zebra striping', type: 'toggle' },
      { path: 'tables.density', label: 'Density', type: 'select', options: ['compact', 'normal', 'relaxed'] },
      { path: 'tables.borderWidth', label: 'Border thickness (px)', type: 'range', min: 0, max: 2, step: 1 },
      { path: 'tables.fontsize', label: 'Font size (px)', type: 'range', min: 11, max: 16, step: 0.5 },
      { path: 'tables.chipRadius', label: 'Status chip radius (px)', type: 'range', min: 0, max: 999, step: 1 },
      { path: 'tables.stickyHeader', label: 'Sticky header', type: 'toggle' },
    ],
  },
  {
    id: 'buttons',
    label: 'Buttons',
    icon: 'bi-hand-index-thumb',
    fields: [
      { path: 'buttons.variant', label: 'Default treatment', type: 'select', options: ['soft', 'solid', 'outline'] },
      { path: 'buttons.radius', label: 'Radius (px)', type: 'range', min: 0, max: 26, step: 1 },
      { path: 'buttons.paddingX', label: 'Horizontal padding (px)', type: 'range', min: 6, max: 32, step: 1 },
      { path: 'buttons.paddingY', label: 'Vertical padding (px)', type: 'range', min: 2, max: 20, step: 1 },
      { path: 'buttons.weight', label: 'Font weight', type: 'select', options: [400, 500, 600, 700] },
      { path: 'buttons.uppercase', label: 'Uppercase labels', type: 'toggle' },
      { path: 'buttons.shadow', label: 'Shadow', type: 'select', options: ['none', 'soft', 'medium'] },
      { path: 'buttons.transitionMs', label: 'Transition (ms)', type: 'range', min: 0, max: 500, step: 10 },
    ],
  },
  {
    id: 'forms',
    label: 'Forms',
    icon: 'bi-input-cursor-text',
    fields: [
      { path: 'forms.inputBg', label: 'Input background', type: 'color' },
      { path: 'forms.inputBorder', label: 'Input border', type: 'color' },
      { path: 'forms.inputRadius', label: 'Input radius (px)', type: 'range', min: 0, max: 24, step: 1 },
      { path: 'forms.controlHeight', label: 'Control height (px)', type: 'range', min: 30, max: 56, step: 1 },
      { path: 'forms.labelWeight', label: 'Label weight', type: 'select', options: [400, 500, 600, 700] },
      { path: 'forms.helperColor', label: 'Helper text color', type: 'color' },
      { path: 'forms.focusRing', label: 'Focus ring color', type: 'color' },
      { path: 'forms.focusRingOpacity', label: 'Focus ring opacity', type: 'range', min: 0, max: 0.6, step: 0.05 },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    icon: 'bi-graph-up',
    fields: [
      { path: 'charts.palette', label: 'Series palette', type: 'palette' },
      { path: 'charts.gridColor', label: 'Grid lines', type: 'color' },
      { path: 'charts.axisColor', label: 'Axis labels', type: 'color' },
      { path: 'charts.lineWidth', label: 'Line width', type: 'range', min: 1, max: 5, step: 0.5 },
      { path: 'charts.areaOpacity', label: 'Area fill opacity', type: 'range', min: 0, max: 0.6, step: 0.02 },
      { path: 'charts.barRadius', label: 'Bar radius (px)', type: 'range', min: 0, max: 16, step: 1 },
      { path: 'charts.donutThickness', label: 'Donut thickness (px)', type: 'range', min: 8, max: 44, step: 2 },
      { path: 'charts.animationMs', label: 'Animation (ms)', type: 'range', min: 0, max: 1200, step: 20 },
      { path: 'charts.legendPosition', label: 'Legend position', type: 'select', options: ['top', 'bottom', 'right', 'none'] },
    ],
  },
  {
    id: 'animations',
    label: 'Animations',
    icon: 'bi-magic',
    fields: [
      { path: 'animations.enabled', label: 'Enable transitions', type: 'toggle' },
      { path: 'animations.speed', label: 'Speed', type: 'select', options: ['fast', 'normal', 'slow'] },
      { path: 'animations.durationMs', label: 'Duration (ms)', type: 'range', min: 0, max: 600, step: 20 },
      { path: 'animations.hoverLift', label: 'Hover lift on interactive cards', type: 'toggle' },
      { path: 'animations.pageTransition', label: 'Page transition', type: 'select', options: ['none', 'fade', 'slide'] },
      { path: 'animations.respectReducedMotion', label: 'Respect reduced-motion OS setting', type: 'toggle' },
    ],
  },
  {
    id: 'responsive',
    label: 'Responsiveness',
    icon: 'bi-phone',
    fields: [
      { path: 'responsive.breakpointLg', label: 'Large breakpoint (px)', type: 'number', min: 768, max: 1400, step: 4 },
      { path: 'responsive.mobileSidebar', label: 'Mobile navigation', type: 'select', options: ['offcanvas', 'drawer', 'collapsed'] },
      { path: 'responsive.tableMode', label: 'Mobile tables', type: 'select', options: ['scroll', 'cards'] },
      { path: 'responsive.compactMobile', label: 'Compact spacing on mobile', type: 'toggle' },
      { path: 'responsive.hideSidebarLabels', label: 'Hide sidebar labels when icon-only', type: 'toggle' },
      { path: 'layout.contentLayout', label: 'Content layout', type: 'select', options: ['fluid', 'container'] },
      { path: 'layout.contentWidth', label: 'Content max width (px)', type: 'range', min: 1100, max: 1800, step: 20 },
      { path: 'layout.gridDensity', label: 'Grid density', type: 'select', options: ['compact', 'comfortable', 'spacious'] },
      { path: 'layout.cardGap', label: 'Card spacing (px)', type: 'range', min: 8, max: 32, step: 2 },
      { path: 'layout.pagePadding', label: 'Page padding (px)', type: 'range', min: 8, max: 48, step: 2 },
    ],
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: 'bi-badge-tm',
    fields: [
      { path: 'meta.name', label: 'Theme name', type: 'text' },
      { path: 'branding.brandName', label: 'Company name', type: 'text' },
      { path: 'branding.brandShort', label: 'Short name', type: 'text' },
      { path: 'branding.subtitle', label: 'Sidebar subtitle', type: 'text' },
      { path: 'branding.logoText', label: 'Logo monogram', type: 'text' },
      { path: 'branding.logoUrl', label: 'Logo image URL', type: 'text' },
      { path: 'branding.logoCompactUrl', label: 'Compact logo URL', type: 'text' },
      { path: 'branding.workspaceName', label: 'Default workspace', type: 'text' },
      { path: 'branding.footerText', label: 'Footer text', type: 'text' },
      { path: 'branding.supportEmail', label: 'Support email', type: 'text' },
      { path: 'branding.showVersionBadge', label: 'Show build badge', type: 'toggle' },
      { path: 'meta.radiusBase', label: 'Base radius (px)', type: 'range', min: 0, max: 24, step: 1 },
    ],
  },
  {
    id: 'custom',
    label: 'Custom CSS',
    icon: 'bi-code-slash',
    fields: [{ path: 'custom.css', label: 'Additional CSS', type: 'css', hint: 'Scoped to the admin app. <script> tags, @import and expression() are stripped before saving.' }],
  },
  {
    id: 'transfer',
    label: 'Import / Export',
    icon: 'bi-arrow-left-right',
    fields: [],
  },
  {
    id: 'history',
    label: 'Version History',
    icon: 'bi-clock-history',
    fields: [],
  },
];

/* ------------------------------ helpers ------------------------------ */

export function getToken(tokens, path) {
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), tokens);
}

export function setToken(tokens, path, value) {
  const next = JSON.parse(JSON.stringify(tokens ?? {}));
  const keys = String(path).split('.');
  let cur = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

export function mergeTokens(base, patch) {
  if (patch === null || patch === undefined) return JSON.parse(JSON.stringify(base ?? {}));
  if (typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeTokens(out[key] && typeof out[key] === 'object' ? out[key] : {}, value)
      : value;
  }
  return out;
}

/**
 * Whitelist + coerce an incoming token object against DEFAULT_TOKENS.
 * Unknown keys are dropped and wrong types fall back to the default, so a
 * malformed (or hostile) payload can never inject arbitrary config.
 */
export function sanitizeTokens(input, defaults = DEFAULT_TOKENS) {
  const walk = (shape, raw) => {
    if (Array.isArray(shape)) {
      if (!Array.isArray(raw)) return [...shape];
      return raw.slice(0, shape.length).map((item, i) =>
        shape[i] !== undefined ? walk(shape[i], item) : String(item).slice(0, 32)
      );
    }
    if (shape && typeof shape === 'object') {
      const out = {};
      for (const [key, value] of Object.entries(shape)) {
        out[key] = walk(value, raw && typeof raw === 'object' ? raw[key] : undefined);
      }
      // Allow the free-form palette to grow/shrink within sane limits.
      if (Array.isArray(raw) && !Array.isArray(shape)) out.__array = raw.slice(0, 12);
      return out;
    }
    if (raw === undefined || raw === null) return shape;
    if (typeof shape === 'number') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : shape;
    }
    if (typeof shape === 'boolean') {
      if (typeof raw === 'boolean') return raw;
      return String(raw) === 'true' ? true : shape;
    }
    return String(raw).slice(0, 4000);
  };
  const clean = walk(defaults, input);
  // Palette arrays are a real array of colour strings.
  if (Array.isArray(input?.charts?.palette)) {
    clean.charts.palette = input.charts.palette
      .filter((c) => typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim()))
      .slice(0, 8);
    if (!clean.charts.palette.length) clean.charts.palette = [...DEFAULT_TOKENS.charts.palette];
  }
  delete clean.__array;
  return clean;
}

export function sanitizeCustomCss(css) {
  return String(css || '')
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/@import[^;]+;/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/<\/style>/gi, '')
    .slice(0, 60000);
}

/* --------------------------- colour maths --------------------------- */

export function normalizeHex(value, fallback = '#000000') {
  const v = String(value || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v.toLowerCase();
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(v);
  if (rgb) {
    const parts = rgb[1].split(',').map((x) => parseFloat(x));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return rgbToHex(parts[0], parts[1], parts[2]);
    }
  }
  return fallback;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = ln - c / 2;
  let rgb = [0, 0, 0];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex((rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255);
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Accessibility audit for the token set. Returns warnings for text pairs that
 * fall below the WCAG AA thresholds (4.5:1 body text, 3:1 large text/UI).
 */
export function contrastAudit(tokens) {
  const t = tokens || DEFAULT_TOKENS;
  const c = t.colors || {};
  const pairs = [
    { label: 'Body text on page background', fg: c.text, bg: c.bg, min: 4.5 },
    { label: 'Muted text on page background', fg: c.textMuted, bg: c.bg, min: 4.5 },
    { label: 'Body text on cards', fg: c.text, bg: c.cardBg, min: 4.5 },
    { label: 'Muted text on cards', fg: c.textMuted, bg: c.cardBg, min: 4.5 },
    { label: 'Sidebar navigation text', fg: c.textMuted, bg: c.sidebarBg, min: 4.5 },
    { label: 'Link on background', fg: c.link, bg: c.bg, min: 3 },
    { label: 'Text on accent (buttons)', fg: c.textInverse, bg: c.accent, min: 4.5 },
    { label: 'Success on card', fg: c.success, bg: c.cardBg, min: 3 },
    { label: 'Warning on card', fg: c.warning, bg: c.cardBg, min: 3 },
    { label: 'Danger on card', fg: c.danger, bg: c.cardBg, min: 3 },
    { label: 'Table header text', fg: (t.tables || {}).headerColor, bg: (t.tables || {}).headerBg, min: 4.5 },
  ];
  return pairs
    .filter((p) => p.fg && p.bg)
    .map((p) => {
      const ratio = contrastRatio(p.fg, p.bg);
      return {
        ...p,
        ratio: Math.round(ratio * 100) / 100,
        pass: ratio >= p.min,
        level: ratio >= p.min ? 'pass' : ratio >= p.min - 1 ? 'warn' : 'fail',
      };
    });
}

export function gradientCss(gradient, fallbackFrom, fallbackTo) {
  const g = gradient || {};
  const angle = Number.isFinite(g.angle) ? g.angle : 135;
  const from = g.from || fallbackFrom || '#000000';
  const to = g.to || fallbackTo || '#ffffff';
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

export const BUILT_IN_DEFAULTS = DEFAULT_TOKENS;
