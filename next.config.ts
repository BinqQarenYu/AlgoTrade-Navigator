import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // This allows the Next.js dev server to accept requests from the
    // Firebase Studio UI.
    allowedDevOrigins: [
      'https://*.cluster-l6vkdperq5ebaqo3qy4ksvoqom.cloudworkstations.dev',
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
