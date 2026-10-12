/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node runtime is required: cookie sessions, middleware, Route Handlers and
  // server-side connector credentials cannot run under a static export.
  // (README §7 item 1 — output: 'export' removed for go-live.)
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
