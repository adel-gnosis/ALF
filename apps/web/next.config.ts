import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@alf/shared'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@tanstack/react-query': path.resolve(__dirname, '../../node_modules/@tanstack/react-query'),
    };
    return config;
  },
};

export default nextConfig;
