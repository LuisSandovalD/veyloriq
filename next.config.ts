import type { NextConfig } from "next";

// Vercel gestiona su propio output; "standalone" solo se usa para Docker/self-host.
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  poweredByHeader: false,
  typedRoutes: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` }
      ]
    }];
  }
};

export default nextConfig;