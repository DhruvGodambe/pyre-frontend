"use client";

/* ============================================================================
   PYRE — Identity context  (wallet OR guest — connecting is never forced)
   ----------------------------------------------------------------------------
   Many people are wary of connecting a wallet, so PYRE doesn't force it. A
   visitor enters one of two ways:

     • "wallet"  — they connect. Their address IS their identity, so at the end
                   of the funnel there's nothing extra to submit; the connected
                   address is recorded automatically.
     • "guest"   — they stay private and pick a username. They complete the same
                   rites, then submit their wallet MANUALLY at the end to claim.

   Identity is DERIVED, not duplicated: a live wallet connection always wins
   (mode "wallet"); otherwise a stored guest choice applies. Only the guest
   choice is persisted (the wallet provider owns connection state / reconnect).
   Composes useWallet(), so when wagmi replaces the mock the shape is unchanged.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Address } from "./types";
import { useWallet } from "./wallet";
import { fetchIdentity, saveIdentity, clearIdentity } from "./quests/client";

export type IdentityMode = "wallet" | "guest";

interface IdentityValue {
  mode: IdentityMode | null;
  address: Address | null; // set when mode === "wallet"
  username: string | null; // set when mode === "guest"
  isSet: boolean;
  /** Begin a wallet connection (delegates to the wallet provider). */
  connectWallet: () => void;
  /** Enter without a wallet under a chosen display name. */
  continueAsGuest: (username: string) => void;
  /** Forget the choice (disconnect + clear guest). */
  reset: () => void;
}

const IdentityContext = createContext<IdentityValue | null>(null);

const KEY = "pyre_identity";

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [guest, setGuest] = useState<{ username: string } | null>(null);

  // Restore the guest choice on mount. localStorage is the instant optimistic
  // cache; the server (keyed by the session cookie) is the durable source of
  // truth and reconciles a beat later — so the name survives a hard refresh
  // even if localStorage was cleared. Declared before the persist effect so it
  // reads before anything could clear it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.username) setGuest({ username: String(parsed.username) });
      }
    } catch {
      /* ignore malformed storage */
    }
    let cancelled = false;
    fetchIdentity().then((srv) => {
      if (cancelled || !srv) return;
      if (srv.mode === "guest" && srv.username) {
        setGuest((g) => g ?? { username: srv.username! });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the guest choice only when set; reset() does the removal explicitly.
  useEffect(() => {
    if (guest) localStorage.setItem(KEY, JSON.stringify(guest));
  }, [guest]);

  const connected = wallet.status === "connected";

  // Mirror a connected wallet to the durable store too (once per address), so a
  // session's identity is recorded server-side, not just derived client-side.
  const savedWallet = useRef<string | null>(null);
  useEffect(() => {
    if (connected && wallet.address && savedWallet.current !== wallet.address) {
      savedWallet.current = wallet.address;
      void saveIdentity({ mode: "wallet", username: null, wallet: wallet.address });
    }
  }, [connected, wallet.address]);

  const continueAsGuest = useCallback((username: string) => {
    const name = username.trim();
    setGuest({ username: name });
    void saveIdentity({ mode: "guest", username: name, wallet: null });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setGuest(null);
    savedWallet.current = null;
    void clearIdentity();
    wallet.disconnect();
  }, [wallet]);

  const value = useMemo<IdentityValue>(() => {
    const mode: IdentityMode | null = connected ? "wallet" : guest ? "guest" : null;
    return {
      mode,
      address: connected ? wallet.address : null,
      username: mode === "guest" ? guest!.username : null,
      isSet: mode !== null,
      connectWallet: wallet.connect,
      continueAsGuest,
      reset,
    };
  }, [connected, wallet.address, wallet.connect, guest, continueAsGuest, reset]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within <IdentityProvider>");
  return ctx;
}
