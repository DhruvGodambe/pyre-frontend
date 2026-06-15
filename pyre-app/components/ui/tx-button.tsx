"use client";

/* ============================================================================
   TxButton — a button bound to a transaction (mutation) hook.
   ----------------------------------------------------------------------------
   Handles the idle → pending → confirmed/failed lifecycle the spec asks for on
   every action, so individual panels don't re-implement it. "Make waiting feel
   ritual": the pending label is where that ritual copy/animation will live.
   ========================================================================== */

import type { ReactNode } from "react";
import { Button } from "./primitives";

interface TxLike {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export function TxButton({
  tx,
  onClick,
  disabled,
  children,
  pendingLabel = "Confirming…",
  variant = "primary",
}: {
  tx: TxLike;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled || tx.isPending}
        className="w-full"
      >
        {tx.isPending ? pendingLabel : children}
      </Button>
      {tx.isError && (
        <p className="text-danger text-xs">{tx.error?.message ?? "Transaction failed"}</p>
      )}
      {tx.isSuccess && <p className="text-success text-xs">Confirmed.</p>}
    </div>
  );
}
