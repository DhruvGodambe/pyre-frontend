"use client";

/* NavCta — a button that sends the user into another building (and optional tab).
   The single conversion primitive: every "Buy $PYRE", "Stake", "Burn to multiply"
   call-to-action across the app routes through here, so the funnel between
   buildings is consistent and works in BOTH shells (the Village opens the target
   building inside; the mobile Dashboard scrolls to it). */

import type { ReactNode } from "react";
import { useNavigation } from "@/lib/navigation";
import { Button } from "./primitives";

export function NavCta({
  to,
  tab,
  variant = "primary",
  className = "w-full",
  children,
}: {
  /** target BuildingId, e.g. "exchange" | "forge" */
  to: string;
  /** optional tab inside that building, e.g. "burn" | "stake" */
  tab?: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  children: ReactNode;
}) {
  const { navigate } = useNavigation();
  return (
    <Button variant={variant} className={className} onClick={() => navigate({ building: to, tab })}>
      {children}
    </Button>
  );
}
