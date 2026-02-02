/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Turbopack (Next.js 16 default)
  turbopack: {},
  // Allow TypeScript errors during migration
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
