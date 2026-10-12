'use client';

import { useEffect } from 'react';

// Global error boundary — never lets a render-side failure blank the whole app.
// Logs to the existing audit endpoint when fetch is available, otherwise to the
// browser console, so failures aren't silently swallowed.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    try {
      const payload = {
        action: 'client.error',
        target: 'app.global_error',
        actor: 'browser',
        result: 'failure',
        detail: { message: error?.message || String(error), stack: (error && error.stack) ? String(error.stack).slice(0, 1000) : null },
      };
      fetch('/api/audit-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    } catch { /* post-error best effort */ }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Something interrupted the admin</h1>
            <p style={{ color: '#444', marginBottom: 16 }}>
              {error?.message || 'An unexpected client-side error happen[REDACTED]The[REDACTED]  log[REDACTED]post[REDACTED]device[REDACTED] console; you can retry below or sign out and back in.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #2255cc', background: '#2255cc', color: '#fff' }}>Retry</button>
              <a href="/admin" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #888', background: '#fff', color: '#222', textDecoration: 'none' }}>Go to dashboard</a>
              <a href="/admin/signin" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #888', background: '#fff', color: '#222', textDecoration: 'none' }}>Sign out</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
