import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: process.env.SITE_BASE_PATH,
  env: {
    NEXT_PUBLIC_SITE_BASE_PATH: process.env.SITE_BASE_PATH ?? "",
  },
}

export default nextConfig;
