"use client";

/* ============================================================================
   PYRE, wagmi + RainbowKit config
   ----------------------------------------------------------------------------
   Single wagmi config for the app: chains, wallet connectors (via RainbowKit's
   getDefaultConfig — MetaMask, Rabby, Coinbase, WalletConnect, etc.), and RPC
   transports. Loaded client-side only (see lib/wallet-providers.tsx).

   Requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at cloud.walletconnect.com).
   ========================================================================== */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

let cached: ReturnType<typeof getDefaultConfig> | undefined;

export function getWagmiConfig() {
  if (cached) return cached;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing. Create a free project at https://cloud.walletconnect.com and add the Project ID to pyre-app/.env.local"
    );
  }

  cached = getDefaultConfig({
    appName: "PYRE",
    projectId,
    chains: [sepolia, mainnet],
    transports: {
      [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_SEPOLIA),
      [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET),
    },
    ssr: true,
  });

  return cached;
}

/** Lazy proxy so chain.ts can import a stable config ref without building it at
    module load (SSR-safe until the first on-chain call on the client). */
export const wagmiConfig: ReturnType<typeof getDefaultConfig> = new Proxy(
  {} as ReturnType<typeof getDefaultConfig>,
  {
    get(_target, prop, receiver) {
      const cfg = getWagmiConfig();
      const val = Reflect.get(cfg, prop, receiver);
      return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(cfg) : val;
    },
  }
);

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
