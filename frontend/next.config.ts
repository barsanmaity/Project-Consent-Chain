import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 1. Add this to fix the Turbopack error */
  turbopack: {},

  /* 2. Ignore TypeScript Errors */
  typescript: {
    ignoreBuildErrors: true,
  },
  
  /* 3. Keep the Webpack fix */
  webpack: (config: any) => {
    config.externals.push("pino", "thread-stream");
    return config;
  },
};

export default nextConfig;