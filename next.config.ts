import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "play-lh.googleusercontent.com" },
    ],
  },
};

export default nextConfig;

// Gives `next dev` the local D1 database from wrangler.jsonc.
initOpenNextCloudflareForDev();
