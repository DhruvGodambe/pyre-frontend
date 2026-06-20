"use client";

/* ============================================================================
   PYRE, Wallet context (MOCK)
   ----------------------------------------------------------------------------
   A tiny mock of wallet connection so the Gate / connected-vs-disconnected
   states work today. Connect = pretend after a short delay. When real wallets
   are wired, replace the internals with wagmi's useAccount/useConnect, the
   useWallet() shape stays the same, so panels don't change.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Address, WalletState } from "./types";

interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const MOCK_ADDRESS = "0x4f3c8a2b1d9e7f6a5c4b3a2918e7d6c5b4a39201" as Address;

export function WalletProvider({ children }: { children: React.ReactNode }) {
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

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
