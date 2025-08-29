import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v2/:path*',
        destination: 'http://localhost:8080/api/v2/:path*',
      },
    ];
  },
};

export default nextConfig;
