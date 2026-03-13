import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2048mb",
    },
    proxyClientMaxBodySize: 2147483648,
  },
};



export default nextConfig;
