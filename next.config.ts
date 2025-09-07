/** next.config.js */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'api.opendota.com',
      'cdn.opendota.com',
      'cdn.pandascore.co',
      'cdn.steamusercontent.com',
      'images.igdb.com',
      // add others you see in Network tab
    ],
  },
};

module.exports = nextConfig;
