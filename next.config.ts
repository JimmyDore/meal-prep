import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.jow.fr" },
      { protocol: "https", hostname: "img.jow.fr" },
    ],
  },
};

export default nextConfig;
