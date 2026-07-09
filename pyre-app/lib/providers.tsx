"use client";

/* App-wide providers: react-query (data caching) + wallet context. When the
   real wallet is active (REAL_WALLET), wagmi's WagmiProvider wraps the tree
   (it must sit ABOVE QueryClientProvider). In pure mock mode it's omitted, so
   the demo carries no wagmi/runtime weight. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import { REAL_WALLET } from "./config";
import { WalletProvider } from "./wallet";
import { IdentityProvider } from "./identity";
import { NavigationProvider } from "./navigation";
import { PreviewProvider } from "./preview";
import { TourProvider } from "./tour";
import { CodexProvider } from "./codex";
import { MuteProvider } from "./mute";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false },
        },
      })
  );

  const tree = (
    <QueryClientProvider client={client}>
      <WalletProvider>
        {/* Identity derives from the wallet (composes useWallet); navigation is
            independent. Both sit above the shells, panels and the intro. */}
        <IdentityProvider>
          <NavigationProvider>
            <PreviewProvider>
              <TourProvider>
                <CodexProvider>
                  <MuteProvider>{children}</MuteProvider>
                </CodexProvider>
              </TourProvider>
            </PreviewProvider>
          </NavigationProvider>
        </IdentityProvider>
      </WalletProvider>
    </QueryClientProvider>
  );

  // wagmi requires QueryClientProvider nested INSIDE WagmiProvider.
  return REAL_WALLET ? <WagmiProvider config={wagmiConfig}>{tree}</WagmiProvider> : tree;
}
