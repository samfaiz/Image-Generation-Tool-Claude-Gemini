import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow rendering images served by the Laravel backend (image proxy).
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
