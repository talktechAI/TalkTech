/** @type {import('next').NextConfig} */
const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

// Any Next.js config can go inside this object if needed:
const nextConfig = {
  // example: reactStrictMode: true,
};

module.exports = setupDevPlatform(nextConfig);
