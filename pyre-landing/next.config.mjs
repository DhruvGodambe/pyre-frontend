/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (the machine has multiple lockfiles).
  outputFileTracingRoot: import.meta.dirname,
  // One mostly-static page whose art is pre-sized at build time; the on-the-fly
  // optimizer adds nothing. Serve the assets directly.
  images: { unoptimized: true },
};

export default nextConfig;
