"use client";

/* ============================================================================
   PYRE, Wallet context
   ----------------------------------------------------------------------------
   One stable shape, useWallet() → { status, address, connect, disconnect },
   with two implementations behind it (chosen by REAL_WALLET in lib/config):

     • MOCK  (default while mocking): pretend-connect after a short delay, no
       extension needed, so the pre-launch demo + guest flow work with zero
       setup.
     • REAL  (USE_MOCK=false, or NEXT_PUBLIC_REAL_WALLET=true): wagmi, injected
       (MetaMask/Rabby) + Coinbase. Requires <WagmiProvider> above (added in
       lib/providers.tsx for the same condition).

   Panels never see the difference: they import useWallet() only.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Address, WalletState } from "./types";
import { REAL_WALLET } from "./config";

interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const MOCK_ADDRESS = "0x4f3c8a2b1d9e7f6a5c4b3a2918e7d6c5b4a39201" as Address;

/* MOCK: pretend-connect so the sealed-preview demo + guest flow need no wallet. */
function MockWalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WalletState["status"]>("disconnected");
  const [address, setAddress] = useState<Address | null>(null);

  const connect = useCallback(() => {
    setStatus("connecting");
    setTimeout(() => {
      setAddress(MOCK_ADDRESS);
      setStatus("connected");
    }, 900);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setStatus("disconnected");
  }, []);

  const value = useMemo(
    () => ({ status, address, connect, disconnect }),
    [status, address, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/* REAL: wagmi-backed. Maps wagmi's account/connect status onto our 3-state shape
   and drives connect() through the injected connector (falling back to whatever
   connector is available). Same shape as the mock, so nothing downstream changes. */
function RealWalletProvider({ children }: { children: React.ReactNode }) {
  const { address, status: accountStatus } = useAccount();
  const { connectAsync, connectors, status: connectStatus } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const status: WalletState["status"] =
    accountStatus === "connected"
      ? "connected"
      : accountStatus === "connecting" ||
          accountStatus === "reconnecting" ||
          connectStatus === "pending"
        ? "connecting"
        : "disconnected";

  const connect = useCallback(() => {
    const connector =
      connectors.find((c) => c.type === "injected") ?? connectors[0];
    // Swallow the user-rejected / no-wallet errors: the UI just stays disconnected.
    if (connector) void connectAsync({ connector }).catch(() => {});
  }, [connectAsync, connectors]);

  const disconnect = useCallback(() => wagmiDisconnect(), [wagmiDisconnect]);

  const value = useMemo<WalletContextValue>(
    () => ({ status, address: (address ?? null) as Address | null, connect, disconnect }),
    [status, address, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // REAL_WALLET is a build-time constant, so this never flips at runtime (no
  // conditional-hook hazard); the chosen provider owns all the hooks.
  return REAL_WALLET ? (
    <RealWalletProvider>{children}</RealWalletProvider>
  ) : (
    <MockWalletProvider>{children}</MockWalletProvider>
  );
}

/* A wallet context pinned to a sample CONNECTED address, used only to render
   sealed pre-launch previews (components/ui/sealed-preview.tsx). It makes
   wallet-gated panels show their real, populated UI instead of a connect wall,
   so visitors see the quality of what we built. Scoped to the preview subtree,
   the real wallet is untouched; connect/disconnect are no-ops (it's inert). */
export function PreviewWalletProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<WalletContextValue>(
    () => ({ status: "connected", address: MOCK_ADDRESS, connect: () => {}, disconnect: () => {} }),
    []
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
