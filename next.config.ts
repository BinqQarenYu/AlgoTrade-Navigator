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
      'aws-sdk': emptyModule,
      'mock-aws-s3': emptyModule,
      nock: emptyModule,
    },
  },

  // ── Webpack config ────────────────────────────────────────────────────────
  webpack: (config) => {
    // ContextReplacementPlugin: restrict the dynamic require context inside
    // @mapbox/node-pre-gyp/lib/ to only match .js files.
    // Without this, webpack's dynamic require analysis includes ALL files in the
    // directory (including the .html file), causing a fatal parse error.
    //
    // The second argument is the newContentResource (directory to use as context root).
    // The third argument is the newContentRegExp (filter what files match in that context).
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        // Match the context module from @mapbox/node-pre-gyp/lib/
        /node_modules[/\\]@mapbox[/\\]node-pre-gyp[/\\]lib/,
        // Restrict context to only .js files (exclude .html, .cs, etc.)
        /\.js$/,
      ),
    );

    // Also restrict node-gyp's dynamic context for the same reason
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /node_modules[/\\]node-gyp[/\\]lib/,
        /\.js$/,
      ),
    );

    // Stub optional/uninstalled deps that some packages try to require conditionally.
    // resolve.alias: matches requires from project source
    // resolve.fallback: matches ALL requires including from within node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'mock-aws-s3': emptyModule,
      'aws-sdk': emptyModule,
      nock: emptyModule,
      bluebird: emptyModule,
      '@opentelemetry/exporter-jaeger': emptyModule,
    };

    // resolve.fallback covers requires coming from inside node_modules themselves.
    // Setting to false means "ignore this module if not found" (no-op empty module).
    config.resolve.fallback = {
      ...config.resolve.fallback,
      nock: emptyModule,
      'mock-aws-s3': emptyModule,
      'aws-sdk': emptyModule,
      bluebird: emptyModule,
      npm: emptyModule,
    };

    // null-load any stray non-JS assets that appear in the build graph.
    // Note: no 'include' filter — on Windows, paths use backslashes so /node_modules/
    // regex may not match. Applied globally to .html and .cs files which only appear
    // inside node_modules anyway (node-pre-gyp and node-gyp).
    config.module.rules.unshift({
      test: /\.(html|cs)$/,
      use: 'null-loader',
      // enforce: 'pre' ensures this runs before any other loader for these file types.
      enforce: 'pre' as const,
    });

    return config;
  },
};

export default nextConfig;
