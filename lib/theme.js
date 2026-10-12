export const DEFAULT_THEME = {
  name: 'Wealth Bloom',
  preset: 'wealth-bloom',
  appearance: 'light',
  colors: {
    page: '#f5f6fb', sidebar: '#ffffff', card: '#ffffff', accent: '#6259c8',
    secondary: '#667085', highlight: '#e6a43b', text: '#24263b', muted: '#667085',
    success: '#15966b', warning: '#b7791f', danger: '#d94b62', border: '#e6e8f0',
  },
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  headingFont: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  fontSize: 14,
  radius: 14,
  sidebarWidth: 264,
  contentWidth: 1480,
  spacing: 'comfortable',
  gradient: { start: '#6259c8', end: '#8979e8', angle: 135 },
};

const makePreset = (name, preset, colors, appearance = 'dark') => ({
  ...DEFAULT_THEME,
  name,
  preset,
  appearance,
  colors: { ...DEFAULT_THEME.colors, ...colors },
});

export const THEME_PRESETS = [
  makePreset('Wealth Bloom', 'wealth-bloom', {
    page: '#f5f6fb', sidebar: '#ffffff', card: '#ffffff', accent: '#6259c8',
    secondary: '#667085', highlight: '#e6a43b', text: '#24263b', muted: '#667085',
    border: '#e6e8f0', success: '#15966b', warning: '#b7791f', danger: '#d94b62',
  }, 'light'),
  makePreset('Rixzo Atelier', 'rixzo-atelier', {
    page: '#f2f6f7', sidebar: '#ffffff', card: '#ffffff', accent: '#239f91',
    secondary: '#66777a', highlight: '#ffb748', text: '#253439', muted: '#65777a',
    border: '#e0e9e8', success: '#16896f', warning: '#b7791f', danger: '#d75f69',
  }, 'light'),
  makePreset('Executive Midnight', 'executive-midnight', {}),
  makePreset('Obsidian Gold', 'obsidian-gold', { page: '#11100F', sidebar: '#171513', card: '#211E19', accent: '#C99742', secondary: '#C9C0B2', highlight: '#F0B75E', text: '#F8F4EC', muted: '#AAA195', border: '#383127', success: '#42B883', warning: '#E5A940', danger: '#E56A6A' }),
  makePreset('Arctic Enterprise', 'arctic-enterprise', { page: '#F2F6FB', sidebar: '#12233A', card: '#FFFFFF', accent: '#225FBD', secondary: '#71839A', highlight: '#C18A34', text: '#142238', muted: '#586A82', border: '#D8E1EC', success: '#13866A', warning: '#A96B15', danger: '#C34154' }, 'light'),
  makePreset('Sapphire Glass', 'sapphire-glass', { page: '#071226', sidebar: '#0A1A34', card: '#102342', accent: '#4B9BFF', secondary: '#A6C4E8', highlight: '#77C8FF', text: '#F2F8FF', muted: '#8FA9C9', border: '#24436A' }),
  makePreset('Graphite Professional', 'graphite-professional', { page: '#17191D', sidebar: '#202329', card: '#252930', accent: '#7D9FCF', secondary: '#B1B8C3', highlight: '#D3B276', text: '#F2F4F7', muted: '#A0A7B2', border: '#393E47' }),
  makePreset('Emerald Business', 'emerald-business', { page: '#0D1717', sidebar: '#10211F', card: '#152622', accent: '#27A985', secondary: '#A8C8BD', highlight: '#D0B269', text: '#F1F8F4', muted: '#99B5AA', border: '#29443E', success: '#22B77C' }),
  makePreset('Royal Indigo', 'royal-indigo', { page: '#111022', sidebar: '#19172F', card: '#201F3C', accent: '#8274E9', secondary: '#B8B5DA', highlight: '#D1B26D', text: '#F6F4FF', muted: '#AAA7C8', border: '#383456' }),
  makePreset('Minimal Cloud', 'minimal-cloud', { page: '#F4F6F8', sidebar: '#FFFFFF', card: '#FFFFFF', accent: '#316CE5', secondary: '#667085', highlight: '#BD842D', text: '#172033', muted: '#667085', border: '#E0E5EC', success: '#13866A', warning: '#A96B15', danger: '#C34154' }, 'light'),
  makePreset('Taurus Slate', 'taurus-slate', { page: '#16222E', sidebar: '#0F2236', card: '#22313F', accent: '#29B6F6', secondary: '#F58220', highlight: '#F5C242', text: '#E8EEF4', muted: '#93A6B8', border: '#33414F', success: '#22C1A6', warning: '#F5C242', danger: '#D9534F' }),
  makePreset('Taurus Cloud', 'taurus-cloud', { page: '#EEF2F6', sidebar: '#0F2236', card: '#FFFFFF', accent: '#0E9BD8', secondary: '#F58220', highlight: '#D99B26', text: '#1B2A38', muted: '#5E7183', border: '#D6DEE7', success: '#13866A', warning: '#A96B15', danger: '#C34154' }, 'light'),
  makePreset('Superieur Violet', 'superieur-violet', { page: '#1E222D', sidebar: '#232733', card: '#2B303C', accent: '#7460EE', secondary: '#2962FF', highlight: '#FFAB00', text: '#E9ECF4', muted: '#9AA4B8', border: '#3A4150', success: '#12B76A', warning: '#FFAB00', danger: '#F62D51' }),
  makePreset('Superieur Daylight', 'superieur-daylight', { page: '#F3F4F8', sidebar: '#232733', card: '#FFFFFF', accent: '#5B4BD6', secondary: '#2962FF', highlight: '#C98A0E', text: '#20242F', muted: '#5C6478', border: '#E3E6EE', success: '#12B76A', warning: '#C98A0E', danger: '#E11D48' }, 'light'),
  makePreset('ProUI Cyan', 'proui-cyan', { page: '#EAEDF1', sidebar: '#394263', card: '#FFFFFF', accent: '#1BBAE1', secondary: '#394263', highlight: '#F0AD4E', text: '#394263', muted: '#7C879C', border: '#E2E6EC', success: '#5CB85C', warning: '#F0AD4E', danger: '#D9534F' }, 'light'),
  makePreset('ProUI Slate', 'proui-slate', { page: '#22262E', sidebar: '#2C3346', card: '#2B313B', accent: '#1BBAE1', secondary: '#9AA6BC', highlight: '#F0AD4E', text: '#DFE4EC', muted: '#9AA6BC', border: '#39404C', success: '#5CB85C', warning: '#F0AD4E', danger: '#D9534F' }),
];

const toRgb = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};

export function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const rgb = toRgb(color);
    if (!rgb) return null;
    const values = rgb.map((n) => {
      const x = n / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function applyTheme(theme = DEFAULT_THEME, appearanceOverride) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const t = { ...DEFAULT_THEME, ...theme, colors: { ...DEFAULT_THEME.colors, ...(theme.colors || {}) } };
  let appearance = appearanceOverride || t.appearance || 'dark';
  if (appearance === 'auto') appearance = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.bsTheme = appearance;
  const c = t.colors;
  const values = {
    '--pb-page-bg': c.page, '--pb-sidebar-bg': c.sidebar, '--pb-card-bg': c.card,
    '--pb-accent': c.accent, '--pb-accent-strong': c.accent, '--pb-secondary-accent': c.secondary,
    '--pb-highlight': c.highlight, '--pb-text': c.text, '--pb-muted': c.muted,
    '--pb-success': c.success, '--pb-warning': c.warning, '--pb-danger': c.danger,
    '--pb-line': c.border, '--pb-input-bg': appearance === 'light' ? '#FFFFFF' : c.page,
    '--bs-primary': c.accent, '--bs-primary-rgb': toRgb(c.accent)?.join(', '),
    '--bs-link-color': c.accent, '--bs-link-hover-color': c.accent,
    '--bs-body-bg': c.page, '--bs-body-color': c.muted, '--bs-emphasis-color': c.text,
    '--bs-secondary-color': c.muted, '--bs-border-color': c.border,
    '--pb-sidebar-w': `${t.sidebarWidth}px`, '--pb-content-max': `${t.contentWidth}px`,
    '--pb-radius': `${t.radius}px`, '--pb-base-font-size': `${t.fontSize}px`,
    '--pb-font-family': t.fontFamily, '--pb-heading-font': t.headingFont,
    '--pb-content-gap': t.spacing === 'compact' ? '12px' : t.spacing === 'spacious' ? '24px' : '16px',
    '--pb-accent-gradient': `linear-gradient(${t.gradient?.angle ?? 135}deg, ${t.gradient?.start || c.accent}, ${t.gradient?.end || c.highlight})`,
  };
  for (const [key, value] of Object.entries(values)) root.style.setProperty(key, value);
  root.style.colorScheme = appearance;
}
