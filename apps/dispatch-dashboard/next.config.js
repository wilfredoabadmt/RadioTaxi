/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Ensure the app knows it's being served from / if needed
  experimental: {
    // This helps with monorepo builds
    externalDir: true,
  },
}

module.exports = nextConfig
