/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.replit.dev',
    '*.replit.app',
    '*.kirk.replit.dev',
    '*.picard.replit.dev',
    '*.janeway.replit.dev',
    '*.sisko.replit.dev',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
