import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    viewTransition: true,
  },
  serverExternalPackages: ["@neondatabase/serverless"],
  // PDF fonts
  outputFileTracingIncludes: {
    "/api/reports/*": ["./lib/reports/fonts/*.ttf"],
  },
};

export default nextConfig;
