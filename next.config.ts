import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  serverExternalPackages: ["@anthropic-ai/sdk", "openai", "cohere-ai", "twilio"],
};

export default config;
