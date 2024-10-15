/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: config => {
      config.externals.push('pino-pretty', 'lokijs', 'encoding')
      return config
    },
    typescript: {
      ignoreBuildErrors: true,
    },
  }

export default nextConfig;
