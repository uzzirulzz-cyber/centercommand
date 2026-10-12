import Link from 'next/link';

export default function StorefrontSignUp() {
  return (
    <div className="pb-auth-wrap">
      <div className="pb-card pb-auth-card">
        <div className="pb-card-body p-4 text-center">
          <h1 className="h5" style={{ color: 'var(--bs-emphasis-color)' }}>Create your PlayBeat account</h1>
          <p style={{ color: 'var(--bs-secondary-color)', fontSize: '.9rem' }}>
            Storefront registration placeholder — separate from all admin roles.
          </p>
          <form>
            <input className="form-control mb-2" type="text" placeholder="Full name" aria-label="Full name" />
            <input className="form-control mb-2" type="email" placeholder="Email" aria-label="Email" />
            <input className="form-control mb-3" type="password" placeholder="Password" aria-label="Password" />
            <button className="btn btn-primary w-100" type="button">Sign up</button>
          </form>
          <small className="d-block mt-3" style={{ color: 'var(--bs-secondary-color)' }}>
            Already registered? <Link href="/signin">Sign in</Link>
          </small>
        </div>
      </div>
    </div>
  );
}
