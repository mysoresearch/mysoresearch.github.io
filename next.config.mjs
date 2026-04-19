/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't bundle yahoo-finance2 — load it directly from node_modules at runtime.
    // This avoids webpack trying to process its Deno-only test imports.
    serverComponentsExternalPackages: ['yahoo-finance2'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.yimg.com' },
      { protocol: 'https', hostname: '**.yahoo.com' },
      { protocol: 'https', hostname: 's.yimg.com' },
    ],
  },
};

export default nextConfig;
