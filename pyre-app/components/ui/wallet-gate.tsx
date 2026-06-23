"use client";

/* Wraps wallet-gated panels: shows a connect prompt when disconnected,
   the real content when connected. Keeps the not-connected state consistent. */

import type { ReactNode } from "react";
import { useWallet } from "@/lib/wallet";
import { EmptyState } from "./state";
import { Button } from "./primitives";

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
  if (status !== "connected") {
    return (
      <EmptyState
        icon="🜂"
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
  return <>{children}</>;
}
