/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  outputFileTracingIncludes: {
    '/': ['./content/**/*'],
  },
  // Multi-zone: /app proxies to the village-world skeleton (its own Vercel
  // project, served under basePath /app). The brief keeps the root; one domain,
  // one password gate. The skeleton validates the same auth cookie.
  async rewrites() {
    return [
      { source: '/app', destination: 'https://pyre-app.vercel.app/app' },
      { source: '/app/:path*', destination: 'https://pyre-app.vercel.app/app/:path*' },
    ];
  },
};

export default nextConfig;
