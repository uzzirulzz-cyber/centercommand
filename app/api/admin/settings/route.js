// Configuration groups persisted in the keyed config store (server-side only).
// Used by SEO & Discovery, Payment Gateways and System Settings.
//
// PostgreSQL stores these as jsonb, which does NOT preserve key order, so the
// write/read-back comparison is key-order independent rather than a raw
// JSON.stringify comparison.
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';
import { csrfValid } from '../../../../lib/auth/guard';
import { audit } from '../../../../lib/audit';
import { getConfig, setConfig } from '../../../../lib/config';

const GROUPS = {
  seo: { read: 'dashboard:view', write: 'seo:write', title: 'SEO & Discovery' },
  payments: { read: 'dashboard:view', write: 'payments:manage', title: 'Payment Gateways' },
  general: { read: 'dashboard:view', write: 'apps:manage', title: 'System Settings' },
};
const keyFor = (group) => `admin.${group}`;

/** Stable stringify: object keys sorted, so jsonb re-ordering is irrelevant. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export async function GET(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const group = new URL(req.url).searchParams.get('group') || 'seo';
  const cfg = GROUPS[group];
  if (!cfg) return NextResponse.json({ error: 'unknown group' }, { status: 404 });
  if (!can(session, cfg.read)) return NextResponse.json({ error: 'forbidden', reason: denyReason(session, cfg.read) }, { status: 403 });
  const value = (await getConfig(keyFor(group))) || null;
  return NextResponse.json({ ok: true, group, title: cfg.title, value, canWrite: can(session, cfg.write), groups: Object.keys(GROUPS) });
}

export async function POST(req) {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!csrfValid(req)) return NextResponse.json({ error: 'invalid csrf token' }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const group = String(body.group || '');
  const cfg = GROUPS[group];
  if (!cfg) return NextResponse.json({ error: 'unknown group' }, { status: 404 });
  if (!can(session, cfg.write)) return NextResponse.json({ error: 'forbidden', reason: denyReason(session, cfg.write) }, { status: 403 });
  if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) {
    return NextResponse.json({ error: 'value must be an object' }, { status: 400 });
  }
  await setConfig(keyFor(group), body.value);
  const readBack = await getConfig(keyFor(group));
  const persisted = stable(readBack) === stable(body.value);
  await audit({ action: `settings.${group}.saved`, actor: session.email, target: group, result: persisted ? 'success' : 'failure' });
  if (!persisted) return NextResponse.json({ error: 'value was not persisted by the store' }, { status: 500 });
  return NextResponse.json({ ok: true, value: readBack, message: `${cfg.title} settings saved and verified by read-back from the server store.` });
}
