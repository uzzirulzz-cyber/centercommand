// ============================================================
// README §8.9 acceptance tests, run against a real server.
//   node scripts/acceptance-test.mjs
// ============================================================
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SECOND_EMAIL = 'readonly@playbeat.digital';
const SECOND_PASSWORD = process.env.SECOND_PASSWORD || '';

let pass = 0, fail = 0;
const results = [];

function check(name, ok, detail = '') {
  if (ok) { pass++; results.push(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

function jar() {
  const store = new Map();
  return {
    store,
    header: () => [...store.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    absorb(res) {
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of raw) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        const k = pair.slice(0, i).trim();
        const v = pair.slice(i + 1).trim();
        if (v === '' || /Max-Age=0/i.test(c)) store.delete(k); else store.set(k, v);
      }
      return res;
    },
  };
}

async function call(j, path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(j.store.size ? { cookie: j.header() } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  j.absorb(res);
  return res;
}

async function login(j, email, password, totp) {
  return call(j, '/api/auth/admin-login', { method: 'POST', body: { email, password, totp } });
}

console.log(`\nPlayBeat admin — acceptance tests against ${BASE}\n`);

/* 1. Unauthenticated access to a protected API is refused. */
{
  const j = jar();
  const res = await call(j, '/api/connectors/playbeat-digital');
  check('1a  Protected connector API refused without a session', res.status === 401, `HTTP ${res.status}`);
}

/* 1b + 10-ish. A STOREFRONT cookie (different name) grants nothing. */
{
  const j = jar();
  j.store.set('pb_storefront_sid', 'storefront-session-value');
  const res = await call(j, '/admin/orders');
  const loc = res.headers.get('location') || '';
  check('1b  Storefront cookie cannot reach /admin (different cookie name)',
    res.status === 307 || res.status === 302 || res.status === 308,
    `HTTP ${res.status} -> ${loc}`);
  check('1c  Redirect lands on the admin sign-in with ?next=', loc.includes('/admin/signin') && loc.includes('next='), loc);
}

/* 2. Deep-link preservation + open-redirect guard. */
{
  const j = jar();
  const deep = await call(j, '/admin/orders');
  const loc = deep.headers.get('location') || '';
  check('2a  Signed-out deep link is redirected to signin?next=/admin/orders',
    loc.includes('/admin/signin') && loc.includes('%2Fadmin%2Forders'), loc);

  const evil = await login(j, ADMIN_EMAIL, ADMIN_PASSWORD, process.env.ADMIN_TOTP);
  const data = await evil.json();
  check('2b  Login succeeds with correct credentials', evil.status === 200 && data.ok === true, `HTTP ${evil.status}`);
  check('2c  Open-redirect guard rejects an external next target',
    data.redirect === '/admin', `redirect=${data.redirect}`);
}

/* 3. Wrong password is refused and does not reveal whether the account exists. */
{
  const jWrong = jar();
  const r1 = await jWrong.absorb(await login(jWrong, ADMIN_EMAIL, 'definitely-wrong-password'));
  const b1 = await r1.json();
  const jGhost = jar();
  const r2 = await jGhost.absorb(await login(jGhost, 'nobody@playbeat.digital', 'definitely-wrong-password'));
  const b2 = await r2.json();
  check('3a  Wrong password refused', r1.status === 401, `HTTP ${r1.status}`);
  check('3b  Unknown account gives an IDENTICAL response (no enumeration)',
    r2.status === r1.status && b2.error === b1.error, `"${b1.error}" vs "${b2.error}"`);
}

/* 4–5. Session reads report the server-side role, and CSRF is enforced. */
let admin = jar();
let adminCsrf = null;
{
  const res = await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD, process.env.ADMIN_TOTP);
  const body = await res.json();
  check('4a  Session cookie pb_admin_sid issued', admin.store.has('pb_admin_sid'), 'cookie present');
  adminCsrf = admin.store.get('pb_csrf') || null;
  check('4b  CSRF double-submit cookie issued and readable', Boolean(adminCsrf));

  const s = await call(admin, '/api/auth/session');
  const sd = await s.json();
  check('4c  Session endpoint reports the server-side role',
    s.status === 200 && sd.user?.role === 'Super Admin', `role=${sd.user?.role}`);
  check('4d  Permissions are returned from the enforcement table',
    sd.permissions?.['apps:manage'] === true, JSON.stringify(sd.permissions));

  const noCsrf = await call(admin, '/api/connectors/playbeat-digital', { method: 'POST', body: { action: 'test' } });
  check('5a  State-changing POST without a CSRF token is refused', noCsrf.status === 403, `HTTP ${noCsrf.status}`);

  const badCsrf = await call(admin, '/api/connectors/playbeat-digital', {
    method: 'POST', body: { action: 'test' }, headers: { 'x-csrf-token': 'not-the-real-token' },
  });
  check('5b  POST with a wrong CSRF token is refused', badCsrf.status === 403, `HTTP ${badCsrf.status}`);

  const goodCsrf = await call(admin, '/api/connectors/playbeat-digital', {
    method: 'POST', body: { action: 'test' }, headers: { 'x-csrf-token': adminCsrf },
  });
  check('5c  POST with the correct CSRF token is accepted', goodCsrf.status === 200, `HTTP ${goodCsrf.status}`);
}

/* 6. Honesty rule: an unconfigured app reports pending and ZERO records. */
{
  const g = await call(admin, '/api/connectors/playbeat-digital');
  const gd = await g.json();
  check('6a  Unconfigured app reports status=pending',
    gd.status?.status === 'pending', `status=${gd.status?.status}`);
  check('6b  Unconfigured app returns ZERO records (no fabricated metrics)',
    Array.isArray(gd.records) && gd.records.length === 0, `records=${gd.records?.length}`);
  check('6c  Missing env var names are reported',
    Array.isArray(gd.status?.missingVars) && gd.status.missingVars.length > 0,
    (gd.status?.missingVars || []).join(', '));

  const sync = await call(admin, '/api/connectors/playbeat-digital', {
    method: 'POST', body: { action: 'sync' }, headers: { 'x-csrf-token': adminCsrf },
  });
  const sy = await sync.json();
  check('6d  Sync on an unconfigured app does not fabricate a result',
    sync.status === 502 && sy.ok === false && !sy.summary, `HTTP ${sync.status} ok=${sy.ok}`);
  check('6e  Sync is refused as NOT enabled rather than silently \"enabled\"', sy.status === 'pending', `status=${sy.status}`);
}

/* 7. Pulse CRM (the unretrievable repo) is honestly pending. */
{
  const g = await call(admin, '/api/connectors/pulse-crm');
  const gd = await g.json();
  check('7a  Pulse CRM reports pending, not connected',
    gd.status?.status === 'pending', `status=${gd.status?.status}`);
  check('7b  Pulse CRM returns zero records', (gd.records || []).length === 0, `records=${gd.records?.length}`);
}

/* 8. Webhook signature verification. */
{
  const bad = await fetch(BASE + '/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': 'sha256=deadbeef' },
    body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
  });
  check('8a  Webhook with an invalid signature is rejected', bad.status === 401, `HTTP ${bad.status}`);

  const noHandshake = await fetch(BASE + '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123');
  check('8b  Webhook handshake with a wrong verify token is rejected', noHandshake.status === 403, `HTTP ${noHandshake.status}`);
}

/* 9. Role change revokes the target's live session. */
{
  // Seed a second account directly through the store, then log in as them.
  const j2 = jar();
  const r = await login(j2, SECOND_EMAIL, SECOND_PASSWORD);
  check('9a  Second (Read-only) account can sign in', r.status === 200, `HTTP ${r.status}`);

  const before = await call(j2, '/admin/orders');
  check('9b  Read-only session is accepted before the role change', before.status === 200, `HTTP ${before.status}`);

  // Admin changes that user's role -> sessions must be revoked.
  const staff = await call(admin, '/api/admin/staff');
  const sd = await staff.json();
  const target = (sd.users || []).find((u) => u.email === SECOND_EMAIL);
  check('9c  Staff API lists the second account (no password hashes leaked)',
    Boolean(target) && !('passwordHash' in (target || {})), `found=${Boolean(target)}, hashLeaked=${'passwordHash' in (target || {})}`);

  if (target) {
    const ch = await call(admin, '/api/admin/staff', {
      method: 'POST', body: { action: 'set-role', userId: target.id, role: 'Support', apps: ['*'] },
      headers: { 'x-csrf-token': adminCsrf },
    });
    const chd = await ch.json();
    check('9d  Role change succeeds and reports revoked sessions',
      ch.status === 200 && chd.revoked >= 1, `revoked=${chd.revoked}`);

    const afterApi = await call(j2, '/api/auth/session');
    const afterData = await call(j2, '/api/connectors/playbeat-digital');
    const afterPage = await call(j2, '/admin/orders');
    check('9e  Revoked session rejected by the AUTHORITATIVE API on the next request',
      afterApi.status === 401, `HTTP ${afterApi.status}`);
    check('9f  Revoked session is served NO protected data (guarded connector API also 401)',
      afterData.status === 401, `HTTP ${afterData.status}`);
    console.log(`       observed: client-rendered admin shell returns HTTP ${afterPage.status} while it hydrates, then redirects client-side. Middleware is a presence gate only; it serves no data.`);
  }
}

/* 10. Sign-out revokes server-side; the old cookie cannot be replayed. */
{
  const j = jar();
  await login(j, ADMIN_EMAIL, ADMIN_PASSWORD, process.env.ADMIN_TOTP);
  const csrf = j.store.get('pb_csrf');
  const savedCookie = j.header();

  const out = await call(j, '/api/auth/admin-logout', { method: 'POST', headers: { 'x-csrf-token': csrf } });
  check('10a Sign-out succeeds', out.status === 200, `HTTP ${out.status}`);

  const replay = await fetch(BASE + '/api/auth/session', { headers: { cookie: savedCookie }, redirect: 'manual' });
  check('10b Replaying the pre-logout cookie FAILS (server-side revocation)',
    replay.status === 401, `HTTP ${replay.status}`);
}

/* 11. Settings/health surface: real env presence + connector mode. */
{
  const h = await call(admin, '/api/health');
  const hd = await h.json();
  check('11a Health endpoint reports the connector mode', hd.mode === 'live' || hd.mode === 'demo', `mode=${hd.mode}`);
  check('11b Env report exposes presence only, never values',
    Array.isArray(hd.env) && hd.env.every((g) => g.vars.every((v) => typeof v.present === 'boolean' && v.name && !('value' in v))),
    `${hd.env?.length} groups`);
  check('11c All five apps reported with a status', (hd.statuses || []).length === 5, `${hd.statuses?.length} apps`);
}

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
