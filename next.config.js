/** @type {import('next').NextConfig} */
const nextConfig = {
  // put any Next.js options you want here
  // example: reactStrictMode: true,
};

if (process.env.NODE_ENV !== 'production') {
  // Use Cloudflare's dev shim ONLY for `npm run dev`
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
  module.exports = setupDevPlatform(nextConfig);
} else {
  // In production, Next needs a plain object
  module.exports = nextConfig;
}
