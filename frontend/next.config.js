/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { 
    unoptimized: true 
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://excel-management-backend.vercel.app/api' : 'http://localhost:5000/api'),
  },
  async rewrites() {
    return process.env.NODE_ENV === 'production' 
      ? [] // No rewrites in production, let Vercel handle it
      : [
          {
            source: '/api/:path*',
            destination: 'http://localhost:5000/api/:path*'  // In development, proxy to backend
          }
        ];
  },
};

module.exports = nextConfig;
