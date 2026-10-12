'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const next = new URLSearchParams(window.location.search).get('next') || '/admin';

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totp, next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.mfaRequired) setMfaRequired(true);
        setError(data.error || 'Sign-in failed.');
        return;
      }
      // The session is an httpOnly cookie now — nothing to store client-side.
      router.replace(data.redirect || '/admin');
      router.refresh();
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pb-auth-page">
      <div className="pb-auth-grid" aria-hidden="true" />
      <div className="pb-auth-frame">
        <section className="pb-auth-story" aria-label="PlayBeat Digital">
          <Link href="/" className="pb-auth-brand" aria-label="PlayBeat Digital home">
            <span className="pb-brand-mark"><span aria-hidden="true">▶</span></span>
            <span className="pb-auth-brand-word">PLAYBEAT <span>DIGITAL</span></span>
          </Link>

          <div className="pb-auth-story-copy">
            <span className="pb-auth-eyebrow pb-auth-story-eyebrow"><span aria-hidden="true">✦</span> ADMIN PANEL · AUTHORIZED PERSONNEL ONLY</span>
            <h2>Powering your <em>digital business</em> ecosystem</h2>
            <p>Sign in to manage analytics, security, systems and operations from a single control center.</p>
          </div>

          <div className="pb-auth-capabilities" aria-label="Admin panel capabilities">
            <span><i aria-hidden="true">↗</i> Analytics</span>
            <span><i aria-hidden="true">⌑</i> Security</span>
            <span><i aria-hidden="true">▤</i> Systems</span>
            <span><i aria-hidden="true">⚙</i> Management</span>
          </div>

          <div className="pb-auth-story-footer">
            <span>PLAYBEAT DIGITAL</span>
            <span>SECURE ADMIN ACCESS</span>
          </div>
        </section>

        <section className="pb-auth-panel" aria-labelledby="signin-title">
          <div className="pb-auth-form-wrap">
            <div className="pb-auth-mobile-brand">
              <span className="pb-brand-mark"><span aria-hidden="true">▶</span></span>
              <span className="pb-auth-brand-word">PLAYBEAT <span>DIGITAL</span></span>
            </div>
            <div className="pb-auth-heading">
              <h1 id="signin-title">Sign in</h1>
              <p>Access your PlayBeat Digital admin panel</p>
            </div>

            {error && <div className="alert alert-danger py-2" role="alert" aria-live="polite">{error}</div>}

            <form onSubmit={submit} className="pb-auth-form">
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Admin email</label>
                <div className="pb-auth-input-wrap">
                  <span className="pb-auth-input-icon" aria-hidden="true">◎</span>
                  <input id="email" type="email" className="form-control" required autoComplete="username"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@playbeat.digital" />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="pw">Password</label>
                <div className="pb-auth-input-wrap">
                  <span className="pb-auth-input-icon" aria-hidden="true">▣</span>
                  <input id="pw" type={showPassword ? 'text' : 'password'} className="form-control" required autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" />
                  <button type="button" className="pb-auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mfaRequired && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="totp">Authenticator code</label>
                  <input id="totp" className="form-control pb-mono" inputMode="numeric" maxLength={6}
                    autoComplete="one-time-code" value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code" />
                </div>
              )}

              <button className="btn btn-primary w-100 pb-auth-submit" disabled={loading}>
                {loading ? 'Signing in…' : mfaRequired ? 'Verify code' : <> <span aria-hidden="true">→</span> Sign in</>}
              </button>
            </form>

            <div className="pb-auth-security">
              <span className="pb-auth-lock" aria-hidden="true">▣</span>
              <p><strong>Secure Access</strong><br />Encrypted connection · Administrator access only</p>
            </div>
          </div>
          <footer className="pb-auth-panel-footer">
            <span>© {new Date().getFullYear()} PLAYBEAT DIGITAL</span>
            <span>All rights reserved</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default function AdminSignIn() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
