import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@noogym/ui", "@noogym/core", "@noogym/types", "@noogym/data-access"]
};

export default nextConfig;
