/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude the old client directory from compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/client/**', '**/node_modules/**'],
    };
    return config;
  },
  // Exclude old directories from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude patterns
  excludeDir: ['client'],
};

module.exports = nextConfig;
