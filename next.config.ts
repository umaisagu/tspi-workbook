import type { NextConfig } from "next";

// Every page is per-user and reads the session, so Cache Components (and its
// static-shell prerendering) buys nothing here; we use the classic dynamic model.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "pdfkit", "exceljs"],
  // pdfkit reads its standard-font metrics (.afm) from disk at runtime; make sure they are deployed.
  // The Reference downloads read the lecturer's workbooks from docs/workbook-v3/.
  outputFileTracingIncludes: {
    "/api/export/**": ["./node_modules/pdfkit/js/data/**"],
    "/api/reference/**": ["./docs/workbook-v3/*.xlsx"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
