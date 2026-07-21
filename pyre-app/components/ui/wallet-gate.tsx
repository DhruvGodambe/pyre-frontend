"use client";

/* Wraps wallet-gated panels: shows a connect prompt when disconnected, prompts
   a network switch when on the wrong chain, then the real content. */

import type { ReactNode } from "react";
import Image from "next/image";
import { useWallet } from "@/lib/wallet";
import { asset, TARGET_CHAIN_NAME } from "@/lib/config";
import { useTargetChain } from "@/lib/target-chain";
import { EmptyState } from "./state";
import { Button } from "./primitives";

function DormantSigil() {
  return (
    <span className="relative grid place-items-center py-1" aria-hidden>
      <span
        className="pointer-events-none absolute inset-0 -m-4 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand) 20%, transparent), transparent 68%)",
        }}
      />
      <Image
        src={asset("/world/ui/pyre-emblem.webp")}
        alt=""
        width={76}
        height={76}
        className="relative select-none opacity-80 [filter:saturate(0.85)]"
        draggable={false}
      />
    </span>
  );
}

export function RequireWallet({
  children,
  title = "The kingdom sleeps",
  message = "Connect your wallet to wake it.",
}: {
  children: ReactNode;
  title?: string;
  message?: string;
}) {
  const { status, connect } = useWallet();
  const { wrongNetwork, switchToTarget, isSwitching, targetChainName } = useTargetChain();

  if (status !== "connected") {
    return (
      <EmptyState
        icon={<DormantSigil />}
        title={title}
        message={message}
        action={
          <Button onClick={connect} disabled={status === "connecting"}>
            {status === "connecting" ? "Connecting…" : "Connect Wallet"}
          </Button>
        }
      />
    );
  }

  if (wrongNetwork) {
    return (
      <EmptyState
        icon={<DormantSigil />}
        title="Wrong network"
        message={`Switch your wallet to ${targetChainName ?? TARGET_CHAIN_NAME} to read balances and trade on PYRE.`}
        action={
          <Button onClick={switchToTarget} disabled={isSwitching}>
            {isSwitching ? "Switching…" : `Switch to ${targetChainName ?? TARGET_CHAIN_NAME}`}
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
