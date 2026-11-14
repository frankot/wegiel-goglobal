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
    "/manual": ["./docs/manual/*.md"],
    "/manual/techniczna": ["./docs/technical/*.md"],
  },
};

export default nextConfig;
