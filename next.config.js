/** @type {import('next').NextConfig} */
const path = require('path')
const nextConfig = {
  compiler: {
    // Strip console.log/warn/debug in production — keep console.error for real issues
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src')
    return config
  }
}
module.exports = nextConfig
