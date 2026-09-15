import type { NextConfig } from "next";

const r2PublicHost = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL.startsWith('http') ? process.env.R2_PUBLIC_URL : `https://${process.env.R2_PUBLIC_URL}`).hostname
  : '';

const nextConfig: NextConfig = {
  // Server Actions default to a 1 MB request body. Allow multipart overhead for
  // the 10 MB image limit enforced by `uploadProductImage`.
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
  images: {
    remotePatterns: r2PublicHost
      ? [{ protocol: 'https', hostname: r2PublicHost }]
      : [],
  },
  async headers() {
    const r2Origin = process.env.R2_PUBLIC_URL || '';
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob:${r2Origin ? ` ${r2Origin}` : ''}`,
              "font-src 'self' data:",
              "connect-src 'self' ws: wss:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
