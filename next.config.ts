import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg uses native Node.js modules (net, tls, dns) that Turbopack must not bundle
  serverExternalPackages: ['pg'],
};

export default nextConfig;
