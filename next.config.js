/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  output: 'standalone',
  trailingSlash: false,
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig