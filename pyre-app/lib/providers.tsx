"use client";

/* App-wide providers: react-query (data caching) + wallet context.
   When wagmi is added, its WagmiProvider wraps these too. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WalletProvider } from "./wallet";
import { IdentityProvider } from "./identity";
import { NavigationProvider } from "./navigation";
import { PreviewProvider } from "./preview";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <WalletProvider>
        {/* Identity derives from the wallet (composes useWallet); navigation is
            independent. Both sit above the shells, panels and the intro. */}
        <IdentityProvider>
          <NavigationProvider>
            <PreviewProvider>{children}</PreviewProvider>
          </NavigationProvider>
        </IdentityProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
