/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use standalone output for Docker & self-hosted AWS, native serverless on Vercel
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3100';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
