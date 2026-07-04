/** @type {import('next').NextConfig} */

/* The Ember Codex lives in the pyre-app project but is SERVED at
   pyreprotocol.com/codex: the brand domain is what KOLs share, and the codex
   is a marketing surface, not part of the app. The rewrites proxy the codex
   page and everything it loads through to the app deployment. afterFiles
   means the landing's own pages and static files always win; only paths the
   landing doesn't have fall through to the app. */
const APP = "https://app.pyreprotocol.com";

const nextConfig = {
  // Pin the workspace root (the machine has multiple lockfiles).
  outputFileTracingRoot: import.meta.dirname,
  // One mostly-static page whose art is pre-sized at build time; the on-the-fly
  // optimizer adds nothing. Serve the assets directly.
  images: { unoptimized: true },
  async rewrites() {
    return {
      afterFiles: [
        // No /_next rewrite: Vercel answers missing /_next/static files before
        // rewrites run, so the app ships absolute asset URLs instead
        // (assetPrefix in pyre-app/next.config.mjs).
        { source: "/codex", destination: `${APP}/codex` },
        { source: "/world/:path*", destination: `${APP}/world/:path*` },
        { source: "/brand/:path*", destination: `${APP}/brand/:path*` },
      ],
    };
  },
};

export default nextConfig;
