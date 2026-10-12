'use client';

import { useEffect, useState } from 'react';

function csrfToken() {
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('pb_csrf='));
  return cookie ? cookie.slice('pb_csrf='.length) : '';
}

// Global error boundary — never lets a render-side failure blank the whole app.
// Logs to the existing audit endpoint when fetch is available, otherwise to the
// browser console, so failures aren't silently swallowed.
export default function GlobalError({ error, reset }) {
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack ? String(error.stack).slice(0, 1000) : null,
    };
    fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error(`Error report rejected (${response.status}).`);
    }).catch((reportError) => {
      console.error('[global-error] Failed to write the render error to the audit log.', reportError);
    });
  }, [error]);

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/admin-logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!response.ok) throw new Error(`Sign out rejected (${response.status}).`);
      window.location.assign('/admin/signin');
    } catch (signOutFailure) {
      console.error('[global-error] Failed to revoke the current session.', signOutFailure);
      setSignOutError(true);
    }
  };

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
            {signOutError && <p role="alert" style={{ color: '#b42318' }}>Sign out failed. Please try again.</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #2255cc', background: '#2255cc', color: '#fff' }}>Retry</button>
              <a href="/admin" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #888', background: '#fff', color: '#222', textDecoration: 'none' }}>Go to dashboard</a>
              <button onClick={signOut} style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #888', background: '#fff', color: '#222' }}>Sign out</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
