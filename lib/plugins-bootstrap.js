// Bootstrap utilities loaded as a client-only script in the admin layout so we
// don't depend on next/script or React lifecycle quirks to bring in Bootstrap's
// offcanvas and dropdown JS. Safe to no-op when Bootstrap is already present.

export const BOOTSTRAP_PREFERENCES_KEY = 'pb_bootstrap_loaded';

export function ensureBootstrapJs() {
  if (typeof window === 'undefined') return;
  if (window.__pbBootstrapReady) {
    window.dispatchEvent('pb:bootstrap:ready');
    return;
  }
  if (window.bootstrap || window.__pbBootstrapLoading) return;
  window.__pbBootstrapLoading = true;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
  script.async = true;
  script.onload = () => {
    window.__pbBootstrapReady = true;
    window.dispatchEvent('pb:bootstrap:ready');
  };
  script.onerror = () => { window.__pbBootstrapLoading = false; };
  document.head.appendChild(script);
}
