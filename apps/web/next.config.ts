import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cura/contracts", "@cura/domain"],
};

export default nextConfig;
