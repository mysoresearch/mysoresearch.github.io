/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.yimg.com' },
      { protocol: 'https', hostname: '**.yahoo.com' },
      { protocol: 'https', hostname: 's.yimg.com' },
    ],
  },
};

export default nextConfig;
