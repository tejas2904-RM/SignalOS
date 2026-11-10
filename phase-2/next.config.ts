import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // SignalOS polls live Redis state; disable component caching for always-fresh APIs.
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
