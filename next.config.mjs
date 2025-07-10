/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure environment variables are available to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  
  // Configure headers for security (CORS is handled by backend)
  async headers() {
    return [
      {
        // Apply security headers to all routes
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
    // Allow production builds even with ESLint warnings for auto-generated files
    ignoreDuringBuilds: true,
  },

  // Experimental features
  experimental: {
    // App directory is now stable in Next.js 15+, no need to explicitly enable
  },

  // Image optimization
  images: {
    domains: [], // Add any external image domains here
  },
};

export default nextConfig;