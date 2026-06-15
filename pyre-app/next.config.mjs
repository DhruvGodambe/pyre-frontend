/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (the machine has multiple lockfiles).
  outputFileTracingRoot: import.meta.dirname,
  // Served under designer.pyreprotocol.com/app via the brief's rewrite
  // (Next.js multi-zones). All routes + assets live under /app.
  basePath: "/app",
};

export default nextConfig;
