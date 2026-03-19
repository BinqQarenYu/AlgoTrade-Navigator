import path from 'path';
import webpack from 'webpack';
import type { NextConfig } from 'next';

// Absolute path to the empty stub module used to replace un-bundleable native packages.
const emptyModule = path.resolve('./src/lib/empty-module.js');

const nextConfig: NextConfig = {
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

  // serverExternalPackages: these packages are excluded from the Next.js RSC server bundle.
  serverExternalPackages: [
    'duckdb',
    'duckdb-async',
    '@mapbox/node-pre-gyp',
    'node-gyp',
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
    'dotprompt',
    '@opentelemetry/sdk-node',
  ],

  // ── Turbopack config ──────────────────────────────────────────────────────
  turbopack: {
    resolveAlias: {
      duckdb: emptyModule,
      'duckdb-async': emptyModule,
      '@mapbox/node-pre-gyp': emptyModule,
      node_gyp: emptyModule,
      'aws-sdk': emptyModule,
      'mock-aws-s3': emptyModule,
      nock: emptyModule,
    },
  },

  // ── Webpack config ────────────────────────────────────────────────────────
  webpack: (config) => {
    // Exclude .html and .cs files from the build graph entirely.
    config.plugins.push(
        new webpack.IgnorePlugin({
            resourceRegExp: /\.(html|cs)$/,
        })
    );

    // ContextReplacementPlugin: restrict the dynamic require context inside
    // @mapbox/node-pre-gyp/lib/ to only match .js files.
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /node_modules[/\\]@mapbox[/\\]node-pre-gyp[/\\]lib/,
        /\.js$/,
      ),
    );

    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /node_modules[/\\]node-gyp[/\\]lib/,
        /\.js$/,
      ),
    );

    // Stub optional/uninstalled deps
    config.resolve.alias = {
      ...config.resolve.alias,
      'mock-aws-s3': emptyModule,
      'aws-sdk': emptyModule,
      nock: emptyModule,
      bluebird: emptyModule,
      '@opentelemetry/exporter-jaeger': emptyModule,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      nock: emptyModule,
      'mock-aws-s3': emptyModule,
      'aws-sdk': emptyModule,
      bluebird: emptyModule,
      npm: emptyModule,
    };

    // Manually mark duckdb as external in webpack as well to avoid bundling native binary dependencies.
    config.externals = [...(config.externals || []), 'duckdb', '@mapbox/node-pre-gyp', 'node-gyp'];

    return config;
  },
};

export default nextConfig;
