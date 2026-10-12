import Link from 'next/link';

export default function StorefrontSignIn() {
  return (
    <div className="pb-auth-wrap">
      <div className="pb-card pb-auth-card">
        <div className="pb-card-body p-4 text-center">
          <h1 className="h5" style={{ color: 'var(--bs-emphasis-color)' }}>PlayBeat.digital — Customer sign in</h1>
          <p style={{ color: 'var(--bs-secondary-color)', fontSize: '.9rem' }}>
            Storefront authentication placeholder. Customer sessions live here and{' '}
            <strong>never</strong> grant access to <span className="pb-mono">/admin</span>.
          </p>
          <form>
            <input className="form-control mb-2" type="email" placeholder="Email" aria-label="Email" />
            <input className="form-control mb-3" type="password" placeholder="Password" aria-label="Password" />
            <button className="btn btn-primary w-100" type="button">Sign in</button>
          </form>
          <small className="d-block mt-3" style={{ color: 'var(--bs-secondary-color)' }}>
            New here? <Link href="/signup">Create an account</Link>
          </small>
        </div>
      </div>
    </div>
  );
}
