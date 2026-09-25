import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Natywne View Transitions przy nawigacji (logowanie ⇄ panel).
    viewTransition: true,
  },
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
