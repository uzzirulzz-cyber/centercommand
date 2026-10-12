# PlayBeat Digital — Central Administration: integration contracts

Source of truth: each application's own repository, cloned and read on 2026-10-11.
Secret **values** are deliberately absent — only variable **names** and endpoints appear here.

## 1. Applications and their real repositories

| Admin app | Repository | Visibility | Stack read from the repo | Contract status |
|---|---|---|---|---|
| PlayBeat.digital | uzzirulzz-cyber/izoko | public | React 19 + Vite SPA, Express `server.ts`, Vercel `api/*`, MongoDB Atlas | contract known |
| PlayBeat.live | uzzirulzz-cyber/playbeat.live (+ livetv, playbeattv) | public | Vite + Express + Cloudflare Workers (R2), Next.js + Prisma | contract known |
| MagXTV.click | uzzirulzz-cyber/magxtv.click | **private** | TypeScript (unread — no access) | pending |
| MakeThisDeal.biz | none found by name | — | candidates: `vbn`, `playbeat-crm-platform` | needs confirmation |
| PlayBeat Pulse CRM | uzzirulzz-cyber/eaedpulseplus | **private** | clone refused — credentials required | pending |

## 2. PlayBeat.digital — admin API surface (verbatim route strings)

Base: `/api/admin`, all routes behind an admin JWT (`Authorization: Bearer` or `adminToken` cookie).

- **orders**: `orders`, `orders-log`, `orders/status`
- **products/inventory**: `products`, `products/check-duplicate`, `products/check-seo-duplicates`, `products/seed-if-empty`, `split-variants`, `categories`, `categories/update`, `inventory`, `inventory/adjust`
- **licenses**: `licenses`, `licenses/import`, `licenses/assign`
- **coupons**: `coupons`, `coupons/delete`, `consolidate-giftcards`
- **customers/staff**: `users`, `staff`, `staff/create`, `staff/update`, `staff/delete`, `staff/promote`, `staff/demote`, `audit-logs`
- **reviews/services**: `reviews`, `reviews/update`, `services`, `services-portfolio`, `service-requests`
- **CMS/media**: `cms/homepage`, `cms/homepage/{update,delete,reorder}`, `cms/settings`, `media`, `documents`, `documents/folders`, `documents/chunk`, `documents/finalize`
- **SEO/analytics**: `seo`, `seo/audit`, `stats`, `top-products`, `revenue-chart`, `growth-status`
- **marketing**: `campaigns`, `tracking-config`, `meta-capi-status`
- **payments**: `gateway-config`, `gateway-logs`, `gateway-test`, `gateway-refund`, `gateway-refunds`, `gateway-refund-status`, `gateway-refund-cancel`, `gateway-resolve`
- **support/comms**: `support-messages`, `whatsapp-{config,status,send,notify-test,templates}`
- **mobile**: `app/release`, `app/version`, `app/devices`, `app/devices/revoke`, `app/heartbeat`, `app/notifications`, `app/push/send`, `app/storefront-config`, `app/storefront-config/reset`
- **ops**: `system-health`, `backup`, `backup/restore`, `backup/delete`, `oauth-config`, `profile`, `profile/password`, `profile/avatar`, `avatar`

Public exemption noted in source: only `avatar` and `media` GET/HEAD bypass the admin gate.

Payment webhook receiver (not under `/api`): `/webhooks/rapid-gateway`.

## 3. PlayBeat.live — endpoints and the admin bridge

Bridge used by the Digital admin (izoko `api/_lib/playbeatLive.ts`):
`GET https://playbeat-storefront.crdbixx.workers.dev/api/digital-dashboard` with `Authorization: Bearer <LIVE_DASHBOARD_TOKEN>`; unconfigured token ⇒ "Live dashboard bridge is not configured." (never fake data).

Channel/content/ops endpoints seen in livetv + playbeattv: `/api/channels`, `/api/geotv/channels`, `/api/geotv/image`, `/api/content/{all,movies,series,songs}`, `/api/catalog/sync-status`, `/api/analytics/live/event`, `/api/analytics/public-config`, `/api/google-tracking`, `/api/checkout/create-order`, `/api/checkout/verify-payment`, `/api/activecode/callback`, `/api/activecode/events`, `/api/diagnostics/ping`, `/api/audit-logs`, `/api/cron/{daily-report,maintenance}`, `/api/cloudflare/{status,verify,dns/records,dns/resolve,dns/setup-zone}`.

## 4. Secret handling policy (must be preserved by the admin)

Gateway credentials are stored server-side, AES-256-GCM encrypted with a key derived from `SESSION_SECRET`, in a dedicated config collection; reads return **masked** values; environment variables are the bootstrap fallback; if the DB or the key is unavailable the system falls back to env and fails closed. The admin must never render a plaintext key.

## 5. Mobile admin (Android) values taken from the app repo

- Shared backend and shared customer database: `https://playbeat.digital/api/*` — one account everywhere.
- Admin login: `POST /api/auth/admin/login` → `{ success, token (7-day JWT), admin }`.
- Package/bundle id `digital.playbeat.app`; Android min OS 7.0 (API 24); iOS min 16.0.
- Empty store URL must render as "Pending deployment" — never a fabricated link.
