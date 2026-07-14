"use client";

/* Wraps wallet-gated panels: shows a connect prompt when disconnected,
   the real content when connected. Keeps the not-connected state consistent. */

import type { ReactNode } from "react";
import Image from "next/image";
import { useWallet } from "@/lib/wallet";
import { asset } from "@/lib/config";
import { EmptyState } from "./state";
import { Button } from "./primitives";

/* The dormant Pyre sigil: the brand emblem sitting over a soft ember bloom,
   dimmed so the kingdom reads as "asleep" until a wallet wakes it. Replaces the
   old alchemical fire glyph (🜂), which read as a meaningless bare triangle. */
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
  return <>{children}</>;
}
