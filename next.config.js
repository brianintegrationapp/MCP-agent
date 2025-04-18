/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.integration.app',
        pathname: '/connectors/**',
      },
    ],
  },
}

module.exports = nextConfig 