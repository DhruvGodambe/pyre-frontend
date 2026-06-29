"use client";

/* ============================================================================
   PYRE, wagmi config  (real wallet connection)
   ----------------------------------------------------------------------------
   The single wagmi config for the app: which chains we support, which wallets
   can connect, and the RPC transport per chain. Consumed by <WagmiProvider> in
   lib/providers.tsx and by the real wallet path in lib/wallet.tsx.

   RPC: http() with no URL falls back to the chain's PUBLIC endpoint, fine for
   testnet dev. Before mainnet, set NEXT_PUBLIC_RPC_SEPOLIA / _MAINNET to a
   dedicated endpoint under the pyreprotocol account (ideally proxied through a
   Next route so the key never ships to the browser). Connectors are injected
   (MetaMask/Rabby/Brave) + Coinbase; WalletConnect (mobile) is added later once
   a pyreprotocol WalletConnect projectId exists (it needs one).
   ========================================================================== */

import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  // injected() auto-discovers every installed browser wallet via EIP-6963
  // (MetaMask, Rabby, Brave, Coinbase extension...), with no extra SDK. Coinbase
  // Smart Wallet + WalletConnect (mobile) come later, they need their own
  // packages + a pyreprotocol WalletConnect projectId.
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_SEPOLIA),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_MAINNET),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
