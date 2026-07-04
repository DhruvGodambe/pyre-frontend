import type { NextConfig } from "next";

/* The Ember Codex lives in the pyre-app project but is SERVED at
   pyreprotocol.com/codex: the brand domain is what KOLs share, and the
   codex is a marketing surface, not part of the app. These rewrites proxy
   the codex page and everything it loads through to the app deployment.
   afterFiles means the landing's own pages and static files always win;
   only paths the landing doesn't have fall through to the app. */

const APP = "https://app.pyreprotocol.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      afterFiles: [
        { source: "/codex", destination: `${APP}/codex` },
        { source: "/_next/:path*", destination: `${APP}/_next/:path*` },
        { source: "/world/:path*", destination: `${APP}/world/:path*` },
        { source: "/brand/:path*", destination: `${APP}/brand/:path*` },
      ],
    };
  },
};

export default nextConfig;
