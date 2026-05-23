import path from "node:path";
import type { NextConfig } from "next";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "https:",
  ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
].join(" ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss://*.supabase.co",
      "frame-src 'self' https://racing.hkjc.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
      "frame-ancestors 'none'",
      "form-action 'self' https://*.supabase.co",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  },
];

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
  },
];

const noIndexSources = [
  "/races/:path*",
  "/results/:path*",
  "/history/:path*",
  "/auth/:path*",
  "/account/:path*",
  "/login/:path*",
  "/signup/:path*",
  "/verify-email/:path*",
  "/forgot-password/:path*",
  "/reset-password/:path*",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "consvc.hkjc.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...noIndexSources.map((source) => ({
        source,
        headers: noIndexHeaders,
      })),
    ];
  },
};

export default nextConfig;
