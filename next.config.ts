import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "tickets.pktech.ai",
        "https://tickets.pktech.ai",
      ],
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
