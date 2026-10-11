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
  // Czcionki PDF czytane z dysku w route handlerze — muszą trafić do bundla funkcji.
  outputFileTracingIncludes: {
    "/api/reports/*": ["./lib/reports/fonts/*.ttf"],
  },
};

export default nextConfig;
