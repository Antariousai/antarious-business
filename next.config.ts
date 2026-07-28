import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Next route-type worker can hang on large client trees; `tsc --noEmit` is the source of truth.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/compat/react-router-dom.tsx',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': path.resolve(process.cwd(), 'src/compat/react-router-dom.tsx'),
    }
    return config
  },
}

export default nextConfig
