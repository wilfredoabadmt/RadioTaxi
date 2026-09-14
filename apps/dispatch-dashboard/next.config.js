/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Ensure the app knows it's being served from / if needed
  experimental: {
    // This helps with monorepo builds
    externalDir: true,
  },
  async rewrites() {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const cleanApi = rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api`;
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${cleanApi}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
