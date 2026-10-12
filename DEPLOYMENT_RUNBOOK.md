# Production Deployment Runbook

This runbook covers the secure production rollout for the PlayBeat admin dashboard, with emphasis on the session store transition and the connector migration from the current JSON-backed demo-safe behavior to a live production configuration.

## 1. Scope and assumptions

This application is configured for a Node.js production deployment. The runtime expects a real server environment and durable storage, not static export mode.

Relevant project files:
- [README.md](./README.md)
- [middleware.js](./middleware.js)
- [lib/auth/store.js](./lib/auth/store.js)
- [lib/store.js](./lib/store.js)
- [lib/connectors/index.js](./lib/connectors/index.js)
- [.env.example](./.env.example)

Production assumptions:
- The app runs behind a trusted HTTPS ingress or platform-managed TLS.
- Secrets are stored in the deployment environment, not checked into source control.
- `DATABASE_URL` or `POSTGRES_URL` points to a managed PostgreSQL database.
- Connector credentials are not committed or exposed to the browser.

---

## 2. Production prerequisites

### 2.1 Required environment variables

Start from [.env.example](./.env.example) and set all required values before deployment. At minimum:

- `PB_CONNECTOR_MODE=live`
- `PB_SESSION_SECRET`
- `PB_CSRF_SECRET`
- `DATABASE_URL` (or `POSTGRES_URL`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` for bootstrapping only
- connector credentials for each enabled service:
  - `PLAYBEAT_DIGITAL_API_URL`, `PLAYBEAT_DIGITAL_API_KEY`
  - `PLAYBEAT_LIVE_API_URL`, `PLAYBEAT_LIVE_API_KEY`
  - `MAGXTV_API_URL`, `MAGXTV_API_KEY`
  - `MAKETHISDEAL_API_URL`, `MAKETHISDEAL_API_KEY`
  - `PULSE_CRM_API_URL`, `PULSE_CRM_API_KEY`
- Meta webhook / WhatsApp configuration if used:
  - `META_GRAPH_VERSION`
  - `META_WABA_TOKEN`
  - `META_PHONE_NUMBER_ID`
  - `META_FB_APP_SECRET`
  - `META_WEBHOOK_VERIFY_TOKEN`

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Do not reuse the same secret across the session and CSRF domains.

### 2.2 Bootstrap admin account

Seed the first admin account once:

```bash
npm install
cp .env.example .env.local
# fill in local secrets and bootstrap credentials
npm run db:migrate
npm run seed:admin
```

Then remove `ADMIN_PASSWORD` from the environment after seeding, and keep it out of the deployment configuration unless the platform requires it at startup for a one-time migration step.

---

## 3. Session store transition

### 3.1 Storage modes

Local development can use JSON files. Production requires PostgreSQL; it fails rather than silently storing data on ephemeral Vercel disk. The relevant code is in:

- [lib/auth/store.js](./lib/auth/store.js)
- [lib/store.js](./lib/store.js)

### 3.2 Production requirement

The production deployment uses PostgreSQL for users, roles, app scope, sessions, login throttling, synced records, sync state, and audit history.

### 3.3 Recommended architecture

The PostgreSQL backend is selected automatically when `DATABASE_URL` or `POSTGRES_URL` is set. The existing store API remains the compatibility boundary:

- `createSession()` / `getSessionBySid()` / `revokeSession()` / `revokeAllForUser()` use `pb_sessions`
- `listUsers()` / `findUserByEmail()` / `upsertUser()` / `setUserRole()` use `pb_users`
- Login throttling uses `pb_login_attempts`
- Synced records and sync state use `pb_records` and `pb_sync_state`
- Audit events use `pb_audit`

Recommended production patterns:
- Session IDs remain opaque 256-bit values stored server-side only.
- Do not put user role or permissions in the cookie.
- Revoke by session ID and by user ID; a role change must invalidate all active sessions for that user.
- Keep the current `pb_admin_sid` cookie contract (`HttpOnly; Secure; SameSite=Lax; Path=/`) intact.

### 3.4 Migration checklist

Before production traffic:

1. Provision a managed PostgreSQL database and set `DATABASE_URL` in Vercel.
2. Run `npm run db:migrate` against that database.
3. Seed the first administrator with `npm run seed:admin`, then remove `ADMIN_PASSWORD`.
4. If importing existing users, insert their JSON records into `pb_users`; do not import `sessions.json`, so old sessions are invalidated.
5. Verify sign-in and session replay checks on a live instance.
6. Verify role changes revoke prior sessions immediately.
7. Confirm logout is effective even when a stale cookie is replayed.

---

## 4. Connector transition

### 4.1 Current default behavior

The admin app is intentionally honest about connector status. In live mode, an app without the required environment variables is considered `pending` and produces zero records. This is enforced in:

- [lib/connectors/index.js](./lib/connectors/index.js)
- [lib/connectors/rest.js](./lib/connectors/rest.js)

The key contract is:
- no configured credentials => pending, no fabricated data
- valid credentials + authenticated health check => connected
- failed health check => degraded or pending depending on configuration state

### 4.2 Recommended rollout

Use a staged rollout to live connectors:

1. Keep `PB_CONNECTOR_MODE=demo` until all credentials and production endpoints are validated.
2. Configure one app at a time for `live` mode.
3. Run a health check and verify the app returns `connected` only after a real authenticated `2xx` response.
4. Run a sync and validate the inserted/updated row counts against the source system.
5. Confirm the app shows zero records when the app is intentionally unconfigured.
6. Once all required apps are validated, switch the production service to `PB_CONNECTOR_MODE=live`.

### 4.3 Connector-specific requirements

For each app, verify the real API contract before enabling production traffic:

- PlayBeat.digital: `PLAYBEAT_DIGITAL_API_URL`, `PLAYBEAT_DIGITAL_API_KEY`
- PlayBeat.live: `PLAYBEAT_LIVE_API_URL`, `PLAYBEAT_LIVE_API_KEY`
- MagXTV.click: `MAGXTV_API_URL`, `MAGXTV_API_KEY`
- MakeThisDeal.biz: `MAKETHISDEAL_API_URL`, `MAKETHISDEAL_API_KEY`
- Pulse CRM: `PULSE_CRM_API_URL`, `PULSE_CRM_API_KEY`

The generic REST adapter currently assumes a health endpoint and list envelope conventions. If the upstream service differs, update the adapter in [lib/connectors/rest.js](./lib/connectors/rest.js) before enabling live sync.

### 4.4 Meta / WhatsApp webhook validation

Meta/WhatsApp webhooks are verified with HMAC-SHA256 over the raw request body. Before enabling live traffic, ensure:

- `META_GRAPH_VERSION` matches the tested Graph API version
- `META_WABA_TOKEN` and `META_PHONE_NUMBER_ID` are correct
- `META_FB_APP_SECRET` matches the app secret used for webhook signing
- `META_WEBHOOK_VERIFY_TOKEN` matches the token configured in the Meta dashboard

The callback flow is implemented in [app/api/webhooks/[app]/route.js](./app/api/webhooks/[app]/route.js).

---

## 5. Runtime and security configuration

### 5.1 Node runtime

The app requires a Node runtime and must not use static export mode. The runtime is set in the route handlers and the app intentionally removed the export-only configuration for session and middleware support.

### 5.2 Cookies and middleware

The middleware in [middleware.js](./middleware.js) is a simple presence gate for the admin session cookie; it is not an authorization oracle. The authoritative checks remain in the route handlers and server code.

Required security properties:
- `pb_admin_sid` is `HttpOnly`, `Secure`, `SameSite=Lax`, and path `/`
- sessions are server-side only
- authorization is server-side via [lib/rbac.js](./lib/rbac.js)
- CSRF checks are enforced on mutation requests

### 5.3 Audit and traceability

Use the append-only audit log for production incidents and operator actions. This is implemented in [lib/audit.js](./lib/audit.js), and it records sign-ins, lockouts, access denials, role changes, and connector actions.

---

## 6. Deployment checklist

Before starting the production deployment:

- [ ] Set all required env values in the deployment environment
- [ ] Set `PB_CONNECTOR_MODE=live`
- [ ] Configure managed PostgreSQL via `DATABASE_URL` or `POSTGRES_URL`
- [ ] Run `npm run db:migrate` against the production database
- [ ] Store secrets outside source control
- [ ] Generate and rotate the session and CSRF secrets
- [ ] Seed admin account and remove bootstrap password from the environment
- [ ] Verify the app is not operating in static export mode
- [ ] Validate a fresh admin login through `/admin/signin`
- [ ] Validate CSRF protection on a mutating API call
- [ ] Validate unauthorized users receive `401`/`403` responses
- [ ] Validate one connector at a time in `live` mode
- [ ] Validate a session replay check fails after sign-out
- [ ] Validate that a role change invalidates the user’s existing sessions

### Vercel project setup

The workspace must be linked to the intended Vercel project and the project must
have its production environment variables configured before deploying:

```bash
npx vercel login
npx vercel link
```

Set the variables in the Vercel project dashboard (Production and Preview as
appropriate), including the managed PostgreSQL URL and distinct session/CSRF
secrets. Do not put production credentials in source files or commit
`.env.local`. Run the database migration against the production database from a
trusted operator environment, then seed the initial administrator there.

Once the linked project, database schema, admin account, and required secrets
are verified, deploy with:

```bash
vercel --prod
```

This checkout currently has no Vercel project link; `vercel link` must be
completed by an authenticated operator before the production deploy command.

---

## 7. Production verification

After deployment, verify the following using a real production server:

```bash
npm run build
npm start
```

Then check:
- `/admin` redirects correctly for signed-out users
- the admin login works with the real admin account
- `/api/auth/session` returns the server-side role for a valid session
- `/api/connectors/[app]` returns `pending` for unconfigured apps
- `/api/connectors/[app]` returns real data only for configured live apps
- webhook endpoints reject invalid signatures with `401`
- role change revokes active user sessions

---

## 8. Rollback and recovery

If the live connector rollout fails:

1. Set `PB_CONNECTOR_MODE=demo` immediately.
2. Disable the affected connector by removing credentials or reverting the app environment.
3. Keep the session store in a consistent state and preserve the audit log.
4. Restore the database or data volume from the latest backup if needed.
5. Re-run the health checks and connector sync steps before re-enabling live mode.

---

## 9. Operational notes

- The JSON store is for local development only; production requires PostgreSQL.
- Database schema updates should be applied before rolling out app versions that depend on them.
- Back up PostgreSQL and verify restores before making connector sync operational.

This runbook should be revisited whenever new connectors are added or the session backend is migrated to a new storage provider.
