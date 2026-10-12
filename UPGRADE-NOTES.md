# PlayBeat Digital — Central Administration upgrade

Upgrade of the existing repo (`uzzirulzz-cyber/adfmenwew`), not a rebuild. Every pre-existing route,
API, auth path, database schema and storefront page is preserved; new modules were added alongside.

## Modules added (each wired to a real server endpoint)
| Area | Route | Backing endpoint |
|---|---|---|
| Central Command Center | /admin/command-center | /api/admin/overview, /api/health |
| Applications & Health | /admin/applications | /api/health, /api/connectors/[app] |
| Theme Studio | /admin/theme-studio | /api/admin/theme (draft · publish · revert · versions · contrast) |
| Visual Page Builder | /admin/page-builder | /api/admin/cms |
| Website CMS | /admin/cms | /api/admin/cms |
| SEO & Discovery | /admin/seo | /api/admin/settings?group=seo |
| Payment Gateways | /admin/payments | /api/admin/settings?group=payments |
| Marketing | /admin/marketing | /api/admin/marketing |
| Analytics | /admin/analytics | /api/admin/analytics |
| Finance & Revenue | /admin/finance | /api/admin/finance |
| Security & Audit | /admin/security | /api/admin/security |
| CRM & Leads | /admin/crm | /api/admin/records/crm |
| Support | /admin/support | /api/admin/records/support |
| WhatsApp / Meta Inbox | /admin/inbox | /api/admin/records/inbox |
| MagXTV Sports | /admin/magxtv | /api/admin/records/magxtv |
| Settings group API (new) | — | /api/admin/settings (seo · payments · general) |

Shared components: ModuleWorkspace, DataGrid, DashboardGrid, ThemeProvider, PayloadView.

## Migration steps
1. `npm install`
2. Create `.env.local` from `.env.example` (never commit it). Production requires `DATABASE_URL` or `POSTGRES_URL`.
3. `npm run db:migrate` — creates pb_users, pb_sessions, pb_login_attempts, pb_records, pb_sync_state, pb_audit. No destructive change.
4. `npm run seed:admin` — creates/updates the first admin, then remove ADMIN_PASSWORD from `.env.local`.
5. `npm run build && npm start` → open `/admin`.

## Integration status (honest)
- Answering now: auth, RBAC, audit, theme, CMS, marketing, layout, records, connectors, health.
- Needs credentials before it can show data: PlayBeat.digital, PlayBeat.live, MagXTV, MakeThisDeal,
  Pulse CRM (`uzzirulzz-cyber/eaedpulseplus`), WhatsApp/Meta. These report **pending / not configured
  with no metrics** rather than placeholder numbers.
- Deferred: live gateway settlement figures, Search Console/AdSense indexation & ad revenue,
  MagXTV betting (intentionally disabled).

## Round 2 — missing sections, premium dashboard sections & themes

### Fixed: helpers that were imported but never exported (runtime breakage)
`components/ui.jsx` was missing several helpers that other files imported, so those
views failed to mount (Next logged "Attempted import error" and the component
rendered nothing):

- `fmtNumber` — used by every dashboard section; **all four existing sections
  (Analytics / Currency / Executive / Breeze) were broken at runtime**.
- `SkeletonRows`, `SkeletonCard`, `ErrorState`, `RelativeTime`, `ExportButtons`,
  `useDebounced`, `downloadFile`, `toCSV`, `toExcelHTML` — used by `DataGrid`,
  `DashboardGrid`, `ModuleWorkspace` and the Applications / Command Center /
  Marketing pages.

All are now implemented (skeletons, relative-time, error-with-retry, client-side
CSV/Excel export, debounce hook). A repo-wide import audit reports **no missing
local exports**.

### Fixed: sidebar now shows every page that exists
`AdminShell` kept its own hand-maintained navigation that omitted ~20 real routes
(finance, CMS, SEO, CRM, marketing, inbox, support, security, inventory, licenses,
subscriptions, coupons, services, requests, media, documents, reviews, payments,
analytics, command center…). The sidebar now renders from the single registry in
`lib/modules.js`, so no existing page is unreachable, with Bootstrap Icons. The
per-application detail links are still generated from the App Registry.

### Added: two premium dashboard sections
`components/DashboardSections.jsx` gained two sections that reproduce the layout
patterns of two premium admin families (Stellar; Star Admin Pro) using this
admin's own Bootstrap 5 markup — no third-party CSS/JS/imagery:

- **Stellar** — activations/net-revenue/viewer/client tiles, performance-indicator
  bars, orders-by-channel, settlement ledger, gateway sales, income & expenses,
  quick status.
- **Star Pro** — sales tiles, range-tabbed (1D/5D/1M/1Y) sales chart, net-profit
  margin gauge, total cost vs revenue, invoice/settlement ledger, world sellings,
  recent-events timeline, product watchlist.

Both read only the existing endpoints (`/api/admin/overview`, `/analytics`,
`/finance`); an unreported figure renders an em dash with the reason, never a
fabricated zero. New section ids are registered in `app/api/admin/dashboards`.

### Added: premium theme presets & layout skins
- Presets (`lib/theme/presets.js`): **Stellar Indigo**, **Star Admin Blue**,
  **Star Admin Dark**.
- Layout skins (`lib/theme/layouts.js` + `app/globals.css`): **Stellar Indigo**,
  **Stellar Midnight**, **Star Pro Azure**, **Star Pro Dark** — each re-points the
  Bootstrap tokens so every existing component follows the skin.

### Also
- `lib/modules.js` now lists `/admin/sports` (it was reachable from the shell but
  absent from the searchable module registry).
