/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude the old client directory from compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/client/**', '**/server/**', '**/shared/**', '**/node_modules/**'],
    };
    return config;
  },
  // Allow TypeScript errors during migration
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow ESLint errors during migration
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
