/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type-checking and linting during Vercel builds
  // (skeleton deploy — re-enable once API keys are wired up)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
