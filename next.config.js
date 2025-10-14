/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' || process.env.VERCEL === '1',
  register: true,
  skipWaiting: true,
})

const nextConfig = {
  output: 'standalone',
  experimental: {
    // typedRoutes: true,
  },
  images: {
    domains: ['localhost'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = withPWA(nextConfig)
