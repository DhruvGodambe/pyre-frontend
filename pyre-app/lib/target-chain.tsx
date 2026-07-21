"use client";

/* Keeps the connected wallet on the app's configured chain (Robinhood mainnet
   in production). Auto-prompts a switch after connect/reconnect; surfaces a
   banner when the wallet stays on the wrong network. */

import { useCallback, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID, REAL_WALLET } from "./config";
import { chainLabel } from "./chains";

export function useTargetChain() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  const onTargetChain = !isConnected || chainId === CHAIN_ID;
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;
  const targetChainName = chainLabel(CHAIN_ID);

  const switchToTarget = useCallback(() => {
    switchChain({ chainId: CHAIN_ID });
  }, [switchChain]);

  return {
    chainId: CHAIN_ID,
    targetChainName,
    onTargetChain,
    wrongNetwork,
    switchToTarget,
    isSwitching: isPending,
    switchError: error?.message ?? null,
  };
}

/** Silently request a network switch whenever the wallet connects off-target. */
export function ChainSync() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const lastChain = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!REAL_WALLET || !isConnected || chainId === CHAIN_ID || isPending) return;
    if (lastChain.current === chainId) return;
    lastChain.current = chainId;
    switchChain({ chainId: CHAIN_ID });
  }, [isConnected, chainId, isPending, switchChain]);

  useEffect(() => {
    if (!isConnected) lastChain.current = undefined;
  }, [isConnected]);

  return null;
}

/** Sticky banner shown kingdom-wide when the wallet is on the wrong chain. */
export function WrongNetworkBanner() {
  const { wrongNetwork, targetChainName, switchToTarget, isSwitching, switchError } =
    useTargetChain();

  if (!REAL_WALLET || !wrongNetwork) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] border-b border-amber-500/40 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-50 backdrop-blur-sm"
    >
      <span>
        Switch to <strong>{targetChainName}</strong> to use PYRE on-chain.
      </span>{" "}
      <button
        type="button"
        onClick={switchToTarget}
        disabled={isSwitching}
        className="ml-2 underline underline-offset-2 disabled:opacity-60"
      >
        {isSwitching ? "Switching…" : "Switch network"}
      </button>
      {switchError ? (
        <span className="mt-1 block text-xs text-amber-200/80">{switchError}</span>
      ) : null}
    </div>
  );
}
