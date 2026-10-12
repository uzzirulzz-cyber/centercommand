
// Own-profile preferences for the signed-in administrator. Password changes are
// owned by the identity store (bcrypt + optional TOTP in lib/auth/credentials),
// so the password action answers honestly instead of pretending to rotate a hash.
import { getConfig, setConfig } from '../../../../lib/config';
import { audit } from '../../../../lib/audit';
import { guard, json, bodyOf, listify } from '../../../../lib/adminRoute';

const keyFor = (email) => `admin.profile.${String(email || '').toLowerCase()}`;
const FIELDS = ['displayName', 'timezone', 'landingPage', 'density', 'notifyOnFailure'];

function normalise(v) {
  const o = {};
  for (const k of FIELDS) o[k] = v && v[k] !== undefined ? v[k] : null;
  return o;
}

export async function GET(req) {
  const { session, error } = await guard(req, 'dashboard:view');
  if (error) return error;
  const value = normalise((await getConfig(keyFor(session.email))) || {});
  return json({
    ok: true, configured: true, status: 'connected', value,
    rows: [],
    items: [
      ...listify(value, FIELDS),
      { label: 'account', detail: session.email },
      { label: 'role', detail: session.role },
      { label: 'application scope', detail: (session.apps || []).join(', ') || 'none' },
    ],
  });
}

export async function POST(req) {
  const { session, error } = await guard(req, 'dashboard:view', { csrf: true });
  if (error) return error;
  const body = await bodyOf(req);
  if (!body) return json({ error: 'invalid request' }, 400);
  const action = String(body.action || 'save');

  if (action === 'password') {
    return json({
      error: 'password changes are handled by the identity store',
      message: 'The administrator password is owned by the seeded credential record (npm run seed:admin, bcrypt). Rotate it there — this panel deliberately does not touch stored hashes.',
    }, 501);
  }
  if (action !== 'save') return json({ error: `unknown action '${action}'` }, 400);

  const next = normalise(body);
  await setConfig(keyFor(session.email), next);
  const back = normalise((await getConfig(keyFor(session.email))) || {});
  const persisted = JSON.stringify(back) === JSON.stringify(next);
  await audit({ action: 'profile.saved', actor: session.email, target: keyFor(session.email), result: persisted ? 'success' : 'failure' });
  if (!persisted) return json({ error: 'value was not persisted by the store' }, 500);
  return json({ ok: true, message: 'Profile preferences saved and verified by read-back.', items: listify(back, FIELDS) });
}
