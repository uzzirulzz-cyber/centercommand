// ============================================================
// /api/health — server-side integration health + env PRESENCE (never values).
// ============================================================
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth/sessions';
import { can } from '../../../lib/rbac';
import { envReport, connectorMode } from '../../../lib/env';
import { allConnectorStatuses } from '../../../lib/connectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    mode: connectorMode(),
    env: envReport(),
    statuses: await allConnectorStatuses(),
    checkedAt: new Date().toISOString(),
  });
}
