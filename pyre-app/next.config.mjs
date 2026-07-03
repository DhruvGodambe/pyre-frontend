/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root (the machine has multiple lockfiles).
  outputFileTracingRoot: import.meta.dirname,
  // Served at the root of app.pyreprotocol.com (its own Vercel project + domain).
  // No basePath: all routes + assets live at "/". If this ever moves back behind
  // a path prefix, set basePath here AND BASE_PATH in lib/config.ts to match.
  // World/building art is already pre-sized & compressed at build time, so the
  // on-the-fly optimizer adds nothing. Serve the assets directly instead.
  images: { unoptimized: true },
  webpack: (config) => {
    // wagmi v3's @wagmi/connectors barrel references a pile of OPTIONAL wallet
    // SDKs (for connectors we don't use, we ship injected() only). webpack can't
    // resolve them statically and fails the build; map each to an empty module
    // so they're skipped. Add a package here if we later adopt that connector and
    // install its SDK. Turbopack honours the libs' optional hints, so webpack-only.
    const wagmiOptionalDeps = [
      "accounts",
      "porto",
      "porto/internal",
      "@base-org/account",
      "@coinbase/wallet-sdk",
      "@metamask/connect-evm",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider",
      "@walletconnect/ethereum-provider",
    ];
    config.resolve.fallback = {
      ...config.resolve.fallback,
      ...Object.fromEntries(wagmiOptionalDeps.map((d) => [d, false])),
    };
    return config;
  },
};

export default nextConfig;
