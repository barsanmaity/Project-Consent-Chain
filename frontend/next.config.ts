import type { NextConfig } from "next";

const nextConfig = {
  /* 1. Ignore TypeScript Errors during build */
  typescript: {
    ignoreBuildErrors: true,
  },
  /* 2. Ignore ESLint Errors during build */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* 3. Fix the "thread-stream" and "pino" crashes */
  webpack: (config: any) => {
    config.externals.push("pino", "thread-stream");
    return config;
  },
};

export default nextConfig;