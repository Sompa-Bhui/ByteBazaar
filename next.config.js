/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;
