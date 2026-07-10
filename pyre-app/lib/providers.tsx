"use client";

/* App-wide providers: react-query (data caching) + wallet context. When the
   real wallet is active (REAL_WALLET), wagmi's WagmiProvider wraps the tree
   (it must sit ABOVE QueryClientProvider). In pure mock mode it's omitted, so
   the demo carries no wagmi/runtime weight. */

import { REAL_WALLET } from "./config";
import { WalletProvider } from "./wallet";
import { IdentityProvider } from "./identity";
import { NavigationProvider } from "./navigation";
import { PreviewProvider } from "./preview";
import { TourProvider } from "./tour";
import { CodexProvider } from "./codex";
import { MuteProvider } from "./mute";
import { AppQueryProvider, WalletProviders } from "./wallet-providers";

export function Providers({ children }: { children: React.ReactNode }) {
  const tree = (
    <WalletProvider>
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
  );

  // Real wallet: WagmiProvider → QueryClientProvider → RainbowKitProvider (order matters).
  // Mock mode: QueryClientProvider only.
  return REAL_WALLET ? (
    <WalletProviders>{tree}</WalletProviders>
  ) : (
    <AppQueryProvider>{tree}</AppQueryProvider>
  );
}
