/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure environment variables are available to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  
  // Configure rewrites for API proxy (optional - for development)
  async rewrites() {
    return [
      // Proxy API calls to backend during development
      {
        source: '/api/v2/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v2/:path*`,
      },
    ];
  },

  // Configure headers for CORS and security
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds even with TypeScript errors (not recommended for production)
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Allow production builds even with ESLint errors (not recommended for production)
    ignoreDuringBuilds: false,
  },

  // Experimental features
  experimental: {
    // Enable app directory (already using it)
    appDir: true,
  },

  // Image optimization
  images: {
    domains: [], // Add any external image domains here
  },
};

export default nextConfig;