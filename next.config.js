/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any Next.js options you need here
};

// Only setup dev platform in development
if (process.env.NODE_ENV === 'development') {
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
  setupDevPlatform();
}

module.exports = nextConfig;