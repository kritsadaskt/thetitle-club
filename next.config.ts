import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/club",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
