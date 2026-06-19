/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (the machine has multiple lockfiles).
  outputFileTracingRoot: import.meta.dirname,
  // Served under designer.pyreprotocol.com/app via the brief's rewrite
  // (Next.js multi-zones). All routes + assets live under /app.
  basePath: "/app",
  // World/building art is already pre-sized & compressed at build time, so the
  // on-the-fly optimizer adds nothing — and its url param doesn't carry basePath,
  // which 400s behind our /app basePath. Serve the assets directly instead.
  images: { unoptimized: true },
};

export default nextConfig;
