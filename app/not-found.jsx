'use client';

import Link from 'next/link';

// Friendly 404 — reachable from anywhere, no auth required so deep links work.
export default function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🛒</div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>That page isn't registered</h1>
        <p style={{ color: '#444', marginBottom: 16 }}>
          The PlayBeat Central Admin cannot find that route. It may have been moved, retired,
          or only exists once the matching application connector is configured.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link href="/admin" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #2255cc', background: '#2255cc', color: '#fff', textDecoration: 'none' }}>Open admin</Link>
          <Link href="/admin/signin" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #888', background: '#fff', color: '#222', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
