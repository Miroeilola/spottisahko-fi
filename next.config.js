/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig