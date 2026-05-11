import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@noogym/admin", "@noogym/ui", "@noogym/core", "@noogym/types", "@noogym/data-access"]
};

export default nextConfig;
