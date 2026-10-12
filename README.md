# PlayBeat Digital — Central Administration Dashboard

Next.js 14 (App Router) + Bootstrap 5. One shared admin shell at `/admin` for the
whole PlayBeat ecosystem: an expandable App Registry, role-based access control,
combined source-traceable data views, **server-side session authentication**, and
**env-driven connectors** that stay honestly `pending` until real credentials exist.

---

## §1 Quick start

```bash
npm install
cp .env.example .env.local      # then fill in what you have
npm run seed:admin              # creates the first admin account
npm run dev                     # http://localhost:3000 -> /admin
```

`npm run seed:admin` reads `ADMIN_EMAIL`, `ADMIN_PASSWORD` (min 12 chars) and
optionally `ADMIN_TOTP_SECRET` from `.env.local`, hashes the password and writes
the account to PostgreSQL when `DATABASE_URL` is set, or to `data/users.json`
for local development. **Remove `ADMIN_PASSWORD` from `.env.local` afterwards.**

```bash
npm run build && npm start      # production
```

For production, configure `DATABASE_URL` (or `POSTGRES_URL`) and initialize
PostgreSQL before starting the app:

```bash
npm run db:migrate
npm run seed:admin
```

The app root `/` redirects to `/admin`.

### Minimum to sign in

| Variable | Why |
|---|---|
| `PB_SESSION_SECRET` | random 32+ bytes — `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `PB_CSRF_SECRET` | a second random value |
| `PB_CONNECTOR_MODE` | `live` or `demo` (see §6) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | consumed once by `seed:admin` |
| `DATABASE_URL` | PostgreSQL connection string required in production; local development can use the JSON fallback |

Everything else is per-connector (§10).

---

## §2 Connected applications (App Registry)

| App | Domain | Connector | Status |
|---|---|---|---|
| PlayBeat.digital | playbeat.digital | REST (env-credentialed) | from live health check |
| PlayBeat.live | playbeat.live | REST (env-credentialed) | from live health check |
| MagXTV.click | magxtv.click | REST (env-credentialed) | from live health check |
| MakeThisDeal.biz | makethisdeal.biz | REST (env-credentialed) | from live health check |
| PlayBeat Pulse CRM | crm.playbeat.digital | REST (env-credentialed) | `pending` until configured |

Registry entries live in `lib/apps.js`. Status is **never** taken from that file at
runtime — it comes from `lib/connectors/index.js`, which reports `pending` for any
app without credentials. An app is marked healthy only after an authenticated
health check returns 2xx.

---

## §3 What's implemented

**Shared shell** — fixed sidebar + sticky topbar, off-canvas mobile nav,
breadcrumbs, global search, app switcher with **live** status dots, notifications,
account menu, light/dark theme persisted to localStorage.

**Modules** — Overview, App Registry + per-app pages, Products & Licenses,
Orders & Payments (payment-proof review badges), Customers & CRM (combined view +
kanban pipeline + messaging integration status), Live TV & Playlists,
Sports & Broadcast (betting stays disabled), Deals & Listings, Reports & Exports
(working client-side CSV), Staff/Roles/Audit, Settings & Health.

**Authentication — real, not stubbed** (§8):

- Opaque 256-bit server-side session ids; the cookie carries an id **only**
- `pb_admin_sid` = `HttpOnly; Secure; SameSite=Lax; Path=/`
- 30-minute sliding idle timeout, 8-hour absolute lifetime
- Sign-out revokes server-side, so replaying the old cookie fails
- bcrypt password verification (cost ≥ 12) with constant-time comparison
- Optional TOTP MFA (RFC 6238) with ±1 step clock drift tolerance
- Per-IP **and** per-account throttling with exponential lockout
- Identical response for unknown account and wrong password (no enumeration)
- Open-redirect guard on the post-login `next` target
- CSRF double-submit token on every state-changing request
- `middleware.js` gate + authoritative re-check in every Route Handler
- Append-only audit log of sign-ins, denials, role changes and connector actions

**Authorization** — `lib/rbac.js` is the single enforcement table, consulted
server-side with **default-deny** and an app-scope check in addition to the action
check. The Staff page renders that same table, so the view cannot drift from the
rules.

**Connectors** — `lib/connectors/` with one `RestConnector` per first-party app,
a `WhatsAppConnector` for Meta, and a `PulseCrmConnector`:

- `healthCheck()` resolves healthy **only** on an authenticated 2xx
- `read()` paginates and accepts a `since` cursor
- `sync()` upserts idempotently by `(app, sourceId)`
- hard timeout, retry with exponential backoff + jitter, rate-limit budget,
  and a circuit breaker that degrades an app rather than hammering it
- inbound webhooks are signature-verified before a payload is accepted

**Reusable UI** (`components/ui.jsx`) — DataTable with pagination, StatusBadge,
SourceBadge, StatCard, Panel, BarChart, EmptyState, ExportCSVButton.

---

## §4 Data integrity & source traceability

1. **Composite keys.** A record is identified by `(app, sourceId)` — the owning
   application plus that application's ORIGINAL record id. Ids are never
   re-numbered, and `SourceBadge` renders the origin on every row.
2. **Customer identity.** Records link only through a verified identifier (email,
   phone, SSO subject). Same-name customers are never auto-merged.
3. **Money is counted once.** Combined totals come from each application's own
   ledger and are then summed. A payment `awaiting review` is not settled revenue.
4. **Currencies stay labeled.** PKR is the reporting currency; USD keeps its label.
5. **No fabricated figures.** An app without working credentials renders as
   `pending` with empty metrics — never placeholder numbers. A stale app carries a
   visible warning with its last successful sync time.

---

## §5 Sync, webhooks & idempotency

- **Replay-safe upsert.** Webhook, manual *Sync Now* and the scheduled sweep all
  funnel into one `upsertRecords(app, rows)`. Running a sync twice converges on the
  same state and cannot create a duplicate.
- **Validation before apply.** A row without a `sourceId` is rejected and counted,
  never partially written.
- **Webhooks verified first.** HMAC-SHA256 over the RAW body with constant-time
  comparison; the same idempotent upsert then handles it, so delivery order never
  matters.
- **Health is earned.** A failed sync never upgrades a status.

---

## §6 The one explicit live/demo switch

`PB_CONNECTOR_MODE` decides where data comes from, and the browser can never
change it:

| Mode | Behaviour |
|---|---|
| `live` | Read the application APIs. An app without credentials returns **no records** and renders `pending`. |
| `demo` | Use the clearly-labelled fixtures in `lib/data.js`. |

The Overview page shows a banner stating which mode is active, and Settings shows
the mode alongside per-app missing-variable names. There is no code path where a
missing credential yields demo numbers labelled as live.

---

## §7 Deployment

`output: 'export'` has been **removed** from `next.config.mjs` — cookie sessions,
middleware and Route Handlers require a Node runtime. `trailingSlash` and
`images.unoptimized` are gone with it; security headers are set in `next.config.mjs`.

Production runs require a durable PostgreSQL database. Set `DATABASE_URL` (or
`POSTGRES_URL`), run `npm run db:migrate`, then seed the admin with
`npm run seed:admin`. User records, sessions, login throttling, synced records,
sync state, and audit events are stored in PostgreSQL. Without a database URL,
local development uses the JSON files under `PB_DATA_DIR`; production fails
explicitly instead of silently using ephemeral disk.

---

## §8 Authentication, sessions & access control

### §8.1 Two identity domains, never interchangeable

| Domain | Routes | Grants admin? |
|---|---|---|
| Storefront customer | `/signin`, `/signup` | **Never** |
| Admin / staff | `/admin/signin`, `/admin/*` | Yes, role-scoped |

Separate cookie names, separate credential stores, separate routes. No shared
"logged in" boolean exists anywhere in the app.

### §8.2 Sessions

Sign-in mints an **opaque, server-side session** — a random 256-bit id, not a
self-contained token carrying claims. Server-side sessions are chosen so
revocation is immediate and an old token cannot outlive a role change.

| Attribute | Value |
|---|---|
| Cookie | `pb_admin_sid` |
| Flags | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Idle timeout | 30 minutes, sliding (`PB_SESSION_IDLE_MINUTES`) |
| Absolute lifetime | 8 hours (`PB_SESSION_ABSOLUTE_HOURS`) |
| Rotation | new id on sign-in; privilege change revokes live sessions |
| Revocation | sign-out, role change, or admin *revoke all sessions* |

### §8.3 Sign-in flow

1. `POST /api/auth/admin-login` with email + password over TLS.
2. Throttle/lockout checked **before** credential verification.
3. Password verified against a bcrypt hash (cost ≥ 12); comparison is
   constant-time; an unknown account still performs a verification against a
   dummy hash so timing does not leak existence.
4. TOTP challenge if the account has MFA enrolled.
5. On success: mint the session, set the cookie, issue the CSRF token, write
   `auth.signin` to the audit log.
6. Redirect to the validated `next` target — internal `/admin/*` only.

> **Algorithm note.** §8.3 historically specified Argon2id; this build uses
> **bcrypt via `bcryptjs`**, a pure-JS zero-native-dependency implementation, so
> the project installs and builds without a compiler toolchain. bcrypt at cost ≥ 12
> is an acceptable password hash — it is **not** a raw or MD5/SHA-1 digest. To move
> to Argon2id, replace the two functions in `lib/auth/credentials.js` with
> `@node-rs/argon2`; no caller changes.

### §8.4 Authorization is enforced server-side, default-deny

`lib/rbac.js` holds the only permission table. `can(session, action, appSlug)`:

- **denies by default** — an action with no explicit allow for the role fails
- **checks app scope as well as the action** — an App Admin scoped to two apps is
  refused on a third even for an action their role permits
- **never trusts a client-supplied role** — not via header, body, cookie or
  localStorage; the role is read from the server-side session record

Every privileged Route Handler passes through `getSession()` → `can()` before it
does any work, and denials are audited.

### §8.5 Identity across the applications (SSO)

If the applications need a single sign-in, use an authorization-code flow with
**PKCE**. Each app keeps its own authorization; tokens are audience-restricted;
passwords, API keys and reusable credentials are never passed between apps; only a
shared opaque subject identifier correlates a person. The dashboard is a client of
the identity provider — it does not become the provider.

### §8.6 Protecting the admin surface

`middleware.js` performs the cheap cookie-**presence** check and redirects to
`/admin/signin?next=…`; the authoritative session lookup and role check run in a
Node Route Handler. Security headers are set in `next.config.mjs` and hardened in
middleware. CSRF uses a double-submit token plus `SameSite=Lax`.

### §8.7 Audit log

Sign-in success/failure (with IP and user agent), lockouts, MFA results,
sign-out, session revocation, role and app-scope changes, permission denials,
connector test/sync/write results, and privileged webhook acceptances. Append-only
JSON Lines in `data/audit.jsonl`, retained per policy.

### §8.8 Non-negotiables

- No credential, token or connector secret ever reaches the browser.
- The prototype's `localStorage` auth flag is **deleted**, not disabled.
- No password is shared between applications, and none is stored recoverably.
- No name-based auto-merge of customers; no double-counted revenue; no invented
  metrics for an application that is not actually connected.
- Refunds, settlements, role changes and broadcast controls each require an
  authorized role and leave an audit trail.

### §8.9 Go-live acceptance tests

1. A storefront session at `/signin` cannot reach any `/admin/*` route.
2. Deep-linking `/admin/orders` while signed out lands on
   `/admin/signin?next=…` and returns there after sign-in, never externally.
3. Each role sees only its permitted actions, and calling a forbidden Route
   Handler directly returns 403.
4. An App Admin scoped to two apps is refused on the scoped-out app.
5. Changing a user's role invalidates their existing session on the next request.
6. Repeated failed sign-ins lock the account temporarily and appear in the audit log.
7. Sign-out revokes the session server-side — replaying the old cookie fails.
8. Combined revenue equals the sum of per-app ledgers, with no double count.
9. A repeated sync produces zero new records; a replayed webhook changes nothing.
10. An unavailable application degrades gracefully with a stale-data warning
    instead of blanking a combined view.

---

## §9 External API contracts — what was verified, and what was not

**Verified against Meta's official documentation** (quoted directly):

- **Send a message** — base URL `https://graph.facebook.com`; endpoint
  `POST /{Version}/{Phone-Number-ID}/messages`; header `Authorization: Bearer <token>`.
  [Meta for Developers — Messages reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/)
- **Webhook signature** — generate a SHA256 signature using the payload and your
  App Secret, then "Compare your signature to the signature in the
  `X-Hub-Signature-256` header"; the header value is prefixed `sha256=`. Implemented
  as HMAC-SHA256 over the **raw** body with a constant-time compare.
  [Meta for Developers — Webhooks getting started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
  · [Create a webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)

**Deliberately left to you — the Graph API version.** Meta publishes, expires and
auto-upgrades versions on a schedule, so hardcoding one would rot silently. The
version is required from `META_GRAPH_VERSION` with **no default**, and
`lib/connectors/meta.js` builds every URL from it. Pick one you have tested against
from the [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog/versions/).

**Not verified — the four first-party REST APIs.** No API specification, base URL
or sandbox was supplied for PlayBeat.digital, PlayBeat.live, MagXTV.click or
MakeThisDeal.biz. `lib/connectors/rest.js` therefore expects **conventions**, and
marks the three spots to adjust:

| Convention assumed | Where |
|---|---|
| health path `/health` | `rest.js` → `healthCheck()` |
| bearer auth header | `rest.js` → `headers()` |
| list envelope `data` / `items` / `results`, paging via `next_page` | `rest.js` → `read()` |

If the services differ, adjust those three spots only — the contract, retries,
pagination, idempotency and guards stay as they are. **Nothing in this build claims
those four endpoints are correct.**

**Not verified — Pulse CRM.** `uzzirulzz-cyber/eaedpulseplus` could not be
retrieved (the request failed — private, renamed, or unavailable to an
unauthenticated fetch), so **no module, endpoint, model or dependency name is
assumed in this code.** `lib/connectors/pulse.js` speaks the same generic REST
contract and stays `pending` until credentials exist. Nothing about that repo is
invented anywhere in this project.

---

## §10 What still needs your credentials

Nothing below is faked; each item is the exact remaining input.

1. **PlayBeat.digital** — `PLAYBEAT_DIGITAL_API_URL`, `PLAYBEAT_DIGITAL_API_KEY`
2. **PlayBeat.live** — `PLAYBEAT_LIVE_API_URL`, `PLAYBEAT_LIVE_API_KEY`
3. **MagXTV.click** — `MAGXTV_API_URL`, `MAGXTV_API_KEY`
4. **MakeThisDeal.biz** — `MAKETHISDEAL_API_URL`, `MAKETHISDEAL_API_KEY`
5. **Pulse CRM** — `PULSE_CRM_API_URL`, `PULSE_CRM_API_KEY` (+ confirm the repo is
   accessible and describe its modules)
6. **Meta / WhatsApp** — `META_GRAPH_VERSION`, `META_WABA_TOKEN`,
   `META_PHONE_NUMBER_ID`, `META_FB_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`
7. **Deployment target** for PlayBeat.digital, and a managed PostgreSQL
   connection configured as `DATABASE_URL` or `POSTGRES_URL`
8. **API specs** for the four first-party apps, so §9's assumed conventions can be
   confirmed rather than assumed

Once (1)–(6) are in `.env.local` and `PB_CONNECTOR_MODE=live`, the App Registry
flips each app from `pending` to a real health-check result and *Sync Now* begins
writing real records.
