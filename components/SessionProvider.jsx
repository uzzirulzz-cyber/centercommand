'use client';

// ============================================================
// Client session context. The server is authoritative — this only caches what
// /api/auth/session returned. It never decides whether you are signed in and
// never stores credentials, roles or a "logged in" flag in localStorage.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | anonymous
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) {
        setSession(null);
        setStatus('anonymous');
        return null;
      }
      const data = await res.json();
      setSession(data);
      setStatus('ready');
      return data;
    } catch {
      setSession(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/admin-logout', {
        method: 'POST',
        headers: { 'x-csrf-token': session?.csrfToken || '' },
      });
    } finally {
      setSession(null);
      setStatus('anonymous');
      // Middleware would also catch this, but an explicit push is faster UX.
      router.replace('/admin/signin');
      router.refresh();
    }
  }, [router, session]);

  /** Every mutating call goes through here so CSRF is never forgotten. */
  const api = useCallback(async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(path, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(method === 'GET' ? {} : { 'x-csrf-token': session?.csrfToken || '' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setStatus('anonymous');
      await refresh();
      return { ok: false, status: res.status, ...data };
    }
    return { ok: res.ok, status: res.status, ...data };
  }, [session, refresh]);

  const can = useCallback(
    (action, appSlug = null) => {
      const perms = session?.permissions;
      if (!perms || perms[action] !== true) return false;
      if (appSlug) {
        const scope = session?.user?.apps || [];
        if (!scope.includes('*') && !scope.includes(appSlug)) return false;
      }
      return true;
    },
    [session]
  );

  return (
    <SessionContext.Provider value={{ session, status, refresh, signOut, api, can }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
