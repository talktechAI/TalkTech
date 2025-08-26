/** @type {import('next').NextConfig} */
const nextConfig = {
  // your normal Next.js config goes here
  // example: reactStrictMode: true,
};

if (process.env.NODE_ENV !== 'production') {
  // only wrap the dev server so getRequestContext() works locally
  const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
  module.exports = setupDevPlatform(nextConfig);
} else {
  // production build must export a plain object
  module.exports = nextConfig;
}
