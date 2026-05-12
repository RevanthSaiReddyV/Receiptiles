import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@receipts/shared", "@receipts/db"],
};

export default nextConfig;
