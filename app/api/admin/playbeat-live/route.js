import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/sessions';
import { can, denyReason } from '../../../../lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIVE_BRIDGE_ORIGIN = 'https://playbeat-storefront.crdbixx.workers.dev';

export async function GET() {
  const session = await getSession({ touch: true });
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(session, 'dashboard:view', 'playbeat-live')) {
    return NextResponse.json({ error: 'forbidden', reason: denyReason(session, 'dashboard:view', 'playbeat-live') }, { status: 403 });
  }

  const checkedAt = new Date().toISOString();
  if (!process.env.LIVE_DASHBOARD_TOKEN) {
    return NextResponse.json({
      ok: true,
      checkedAt,
      refreshSeconds: 60,
      source: { connected: false, status: 'pending', error: 'Live dashboard bridge token is not configured.' },
      traffic: { connected: false },
      commerce: { connected: false, reason: 'PlayBeat.live checkout is not connected yet; Digital orders stay separate.' },
      inquiries: { connected: false, reason: 'No PlayBeat.live inquiry or messaging source is connected yet.' },
      limitations: ['GA4 reports are not connected.', 'AdSense revenue is not connected.', 'Live checkout and inquiry integrations are not connected.'],
    });
  }

  try {
    const response = await fetch(`${LIVE_BRIDGE_ORIGIN}/api/digital-dashboard`, {
      headers: { Authorization: `Bearer ${process.env.LIVE_DASHBOARD_TOKEN}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      return NextResponse.json({ ok: true, checkedAt, refreshSeconds: 60, source: { connected: false, status: 'degraded', error: `Live bridge returned HTTP ${response.status}.` }, traffic: { connected: false }, commerce: { connected: false, reason: 'Live checkout is not connected.' }, inquiries: { connected: false, reason: 'Live inquiries are not connected.' }, limitations: ['GA4 reports are not connected.', 'AdSense revenue is not connected.', 'Live checkout and inquiry integrations are not connected.'] });
    }
    const raw = await response.text();
    if (raw.length > 1_000_000) throw new Error('Live bridge response exceeded the size limit.');
    const bridge = JSON.parse(raw);
    if (bridge?.schemaVersion !== 1) throw new Error('Live bridge returned an unsupported response version.');
    return NextResponse.json({
      ok: true,
      checkedAt,
      refreshSeconds: 60,
      source: { connected: true, status: 'connected', schemaVersion: bridge.schemaVersion, checkedAt },
      // The upstream is the Digital settings bridge, not a Live analytics feed.
      // Never render its Digital figures as PlayBeat.live activity.
      traffic: { connected: false },
      google: bridge.google || null,
      commerce: { connected: false, reason: 'PlayBeat.live checkout is not connected yet; Digital orders stay separate.' },
      inquiries: { connected: false, reason: 'No PlayBeat.live inquiry or messaging source is connected yet.' },
      limitations: ['GA4 reports are not connected.', 'AdSense revenue is not connected.', 'Live checkout and inquiry integrations are not connected.'],
    });
  } catch {
    return NextResponse.json({ ok: true, checkedAt, refreshSeconds: 60, source: { connected: false, status: 'degraded', error: 'Live dashboard bridge could not be reached or returned invalid data.' }, traffic: { connected: false }, commerce: { connected: false, reason: 'Live checkout is not connected.' }, inquiries: { connected: false, reason: 'Live inquiries are not connected.' }, limitations: ['GA4 reports are not connected.', 'AdSense revenue is not connected.', 'Live checkout and inquiry integrations are not connected.'] });
  }
}
