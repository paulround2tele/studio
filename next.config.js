/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for better development experience
  reactStrictMode: true,
  
  // SWC minifier is enabled by default in Next.js 15, no need to specify
  
  // Experimental features for Next.js 15 stable
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'date-fns',
      'recharts'
    ]
  },

  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    // Enable for development
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },

  // Compiler optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Enable React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production'
  },

  // Build optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimization for faster builds
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Split chunks for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'all',
            priority: 20,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }

    // Faster module resolution
    config.resolve.symlinks = false;
    
    return config;
  },

  // Output configuration for deployment
  output: 'standalone',

  // Image optimization settings
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },

  // Reduce bundle size by excluding source maps in production
  productionBrowserSourceMaps: false,

  // Enable compression
  compress: true,

  // Disable X-Powered-By header for security
  poweredByHeader: false,

  // Static optimization
  trailingSlash: false,

  // Bundle analyzer (only when ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../analyze/client.html'
          })
        );
      }
      return config;
    }
  }),
};

export default nextConfig;