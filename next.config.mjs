/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.yimg.com' },
      { protocol: 'https', hostname: '**.yahoo.com' },
      { protocol: 'https', hostname: 's.yimg.com' },
    ],
  },
  webpack: (config) => {
    // yahoo-finance2 ESM build pulls in Deno-only test deps at the module level.
    // Stub them out so webpack doesn't try to bundle them.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
      '@gadicc/fetch-mock-cache/stores/fs.ts': false,
    };
    return config;
  },
};

export default nextConfig;
