import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Worker reverse proxy: thetitleresidence.com/club → Cloud Server
  // ตั้ง basePath ให้ assets และ links ทำงานถูกต้องเมื่อ serve จาก /club
  basePath: "/club",
  assetPrefix: "/club",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
