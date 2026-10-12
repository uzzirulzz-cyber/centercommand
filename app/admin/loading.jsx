'use client';

export default function Loading() {
  return (
    <div className="pb-auth-wrap" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
      <div className="text-center" style={{ color: 'var(--bs-secondary-color, #8893aa)' }}>
        <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
        Loading module…
      </div>
    </div>
  );
}
