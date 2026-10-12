
// Dashboard theme layouts for the PlayBeat administration.
// Layout *patterns* only: colour, surface, radius, density and section rhythm.
// No CSS, JS, markup or imagery is copied from any third-party template — the
// skins below are plain Bootstrap 5 variables written for this admin.
export const LAYOUTS = [
  { id: 'executive', label: 'PlayBeat Executive Midnight', family: 'PlayBeat', nav: 'vertical', mode: 'dark',
    note: 'The original central-administration shell.' },
  { id: 'rixzo-art', label: 'Rixzo Sales Atelier', family: 'Rixzo', nav: 'vertical', mode: 'light',
    note: 'An editorial sales canvas with a real-data revenue line, airy mint surfaces, and warm accent details.' },
  { id: 'tresto-analytics', label: 'Light Analytics', family: 'Analytics', nav: 'vertical', mode: 'light',
    note: 'Icon rail, four pastel metric banners, layered wave chart, product table, review breakdown, sales line.' },
  { id: 'tresto-crypto', label: 'Currency & Exchange', family: 'Exchange', nav: 'vertical', mode: 'dark',
    note: 'Dark slate, orange/green accent pair, 24h change cards, coin price cards, activity ledger, exchange panel.' },
  { id: 'tresto-executive', label: 'Executive Horizontal', family: 'Executive', nav: 'horizontal', mode: 'light',
    note: 'Navy horizontal band, turnover/client hero metrics, availability gauge, online/offline gradient area, two radial gauges.' },
  { id: 'breeze-light', label: 'Breeze Light', family: 'Breeze', nav: 'vertical', mode: 'light',
    note: 'Soft grey canvas, white cards, indigo accent, compact density.' },
  { id: 'breeze-dark', label: 'Breeze Dark', family: 'Breeze', nav: 'vertical', mode: 'dark',
    note: 'Deep indigo canvas, elevated cards, indigo accent.' },
  { id: 'breeze-horizontal', label: 'Breeze Horizontal', family: 'Breeze', nav: 'horizontal', mode: 'light',
    note: 'Light canvas with a horizontal section bar in the content area.' },
  { id: 'breeze-horizontal-dark', label: 'Breeze Horizontal Dark', family: 'Breeze', nav: 'horizontal', mode: 'dark',
    note: 'Dark canvas with a horizontal section bar in the content area.' },
  { id: 'stellar-light', label: 'Stellar Indigo', family: 'Stellar', nav: 'vertical', mode: 'light',
    note: 'Premium analytics: indigo/violet accent, soft elevated cards, performance bars, channel mix, settlement ledger, gateway sales.' },
  { id: 'stellar-dark', label: 'Stellar Midnight', family: 'Stellar', nav: 'vertical', mode: 'dark',
    note: 'The Stellar performance pattern on a midnight canvas.' },
  { id: 'starpro-light', label: 'Star Pro Azure', family: 'Star Admin Pro', nav: 'horizontal', mode: 'light',
    note: 'Premium sales dashboard: azure/cyan accent, range-tabbed sales chart, profit-margin gauge, invoice ledger, world sellings, watchlist.' },
  { id: 'starpro-dark', label: 'Star Pro Dark', family: 'Star Admin Pro', nav: 'horizontal', mode: 'dark',
    note: 'The Star Pro sales pattern on deep navy panels.' },
  { id: 'taurus-slate', label: 'Taurus Slate', family: 'Taurus', nav: 'vertical', mode: 'dark',
    note: 'Glossy navy panels, sky-blue and amber accents, compact corners, small uppercase card headers.' },
  { id: 'taurus-topnav', label: 'Taurus Top Nav', family: 'Taurus', nav: 'horizontal', mode: 'dark',
    note: 'The Taurus panel pattern with the full-width horizontal menu band.' },
  { id: 'superieur-dark', label: 'Superieur Midnight', family: 'Superieur', nav: 'vertical', mode: 'dark',
    note: 'Premium command centre: near-black slate canvas, elevated slate panels, indigo/violet accent, coral for urgent states, tight corners, hero banner with a live ticker strip.' },
  { id: 'superieur-light', label: 'Superieur Daylight', family: 'Superieur', nav: 'vertical', mode: 'light',
    note: 'The Superieur command-centre pattern on a soft grey canvas with white panels.' },
  { id: 'proui-light', label: 'ProUI Cyan', family: 'ProUI', nav: 'vertical', mode: 'light',
    note: 'Flat light widgets with a coloured top border and a round icon badge, cyan accent, tight corners, dark slate welcome banner.' },
  { id: 'proui-dark', label: 'ProUI Slate', family: 'ProUI', nav: 'vertical', mode: 'dark',
    note: 'The ProUI widget pattern on a dark slate canvas.' },
];
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export const DEFAULT_LAYOUT_ID = 'executive';
export function layoutById(id) { return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]; }
