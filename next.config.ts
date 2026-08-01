
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['duckdb', '@mapbox/node-pre-gyp', 'node-gyp'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.cs$/,
      type: 'asset/source'
    });
    return config;
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
