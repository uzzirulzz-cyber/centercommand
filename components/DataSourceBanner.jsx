'use client';

// ============================================================
// THE ONE EXPLICIT SWITCH between fixture data and live connector reads.
//
// mode === 'live'  -> read from the connectors (server-side, credentialed).
//                     An unconfigured app returns NO records: the view renders
//                     'not configured' rather than fabricated metrics.
// mode === 'demo'  -> the clearly-labelled fixtures in lib/data.js.
//
// The mode is decided server-side and passed in as a prop, so the browser can
// never talk itself into 'live'.
// ============================================================
import { useEffect, useState } from 'react';

export default function DataSourceBanner({ mode, statuses }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const live = mode === 'live';
  const pending = (statuses || []).filter((s) => s.status === 'pending').map((s) => s.slug);

  return (
    <div className={`alert ${live ? 'alert-info' : 'alert-warning'} d-flex gap-2 align-items-start py-2 px-3 mb-3`} role="status">
      <span>{live ? '🔌' : '🧪'}</span>
      <div className="flex-grow-1 small">
        {live ? (
          <>
            <strong>Live connectors</strong> — reading from the application APIs.
            {pending.length > 0 && (
              <> Not yet configured, shown with <strong>no metrics</strong>: <span className="pb-mono">{pending.join(', ')}</span>.</>
            )}
          </>
        ) : (
          <>
            <strong>Demo mode</strong> — <span className="pb-mono">PB_CONNECTOR_MODE=demo</span>, so this dashboard shows
            the labelled fixture dataset from <span className="pb-mono">lib/data.js</span>. No live application is being
            read. Set <span className="pb-mono">PB_CONNECTOR_MODE=live</span> and supply credentials for real data.
          </>
        )}
      </div>
      <button className="btn-close btn-sm" aria-label="Dismiss" onClick={() => setOpen(false)} />
    </div>
  );
}

/** Small hook so a page can pull connector status + records for one app. */
export function useAppData(slug, api) {
  const [state, setState] = useState({ loading: true, status: null, records: [], syncState: null, error: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api(`/api/connectors/${slug}`);
      if (!alive) return;
      setState({
        loading: false,
        status: res?.status || null,
        records: res?.records || [],
        syncState: res?.syncState || null,
        error: res?.error || null,
      });
    })();
    return () => { alive = false; };
  }, [slug, api]);
  return state;
}
