
// Shared guard for admin route handlers: session -> optional CSRF -> capability.
// Mirrors the checks used by the existing /api/admin/* routes so new modules
// cannot accidentally ship a weaker gate.
import { NextResponse } from 'next/server';
import { getSession } from './auth/sessions';
import { can, denyReason } from './rbac';
import { csrfValid } from './auth/guard';

export async function guard(req, perm, { csrf = false } = {}) {
  const session = await getSession({ touch: true });
  if (!session) return { error: json({ error: 'unauthenticated' }, 401) };
  if (csrf && !csrfValid(req)) return { error: json({ error: 'invalid csrf token' }, 403) };
  if (perm && !can(session, perm)) return { error: json({ error: 'forbidden', reason: denyReason(session, perm) }, 403) };
  return { session };
}

export function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

export async function bodyOf(req) {
  try { return await req.json(); } catch { return null; }
}

// List envelopes differ per application; normalise without inventing rows.
export function extractRows(page) {
  if (Array.isArray(page)) return page;
  if (!page || typeof page !== 'object') return [];
  for (const k of ['rows', 'data', 'items', 'results', 'records', 'list']) {
    if (Array.isArray(page[k])) return page[k];
  }
  return [];
}

export function listify(obj, keys = ['label', 'name', 'title']) {
  return Object.entries(obj || {}).map(([k, v]) => ({
    label: k,
    detail: typeof v === 'object' ? JSON.stringify(v) : String(v),
  }));
}
