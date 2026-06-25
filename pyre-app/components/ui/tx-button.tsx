"use client";

/* ============================================================================
   TxButton, a button bound to a transaction (mutation) hook.
   ----------------------------------------------------------------------------
   Handles the idle → pending → confirmed/failed lifecycle the spec asks for on
   every action, so individual panels don't re-implement it. "Make waiting feel
   ritual": the pending label is where that ritual copy/animation will live.
   ========================================================================== */

import type { ReactNode } from "react";
import { Button } from "./primitives";
import { ImageButton, type ImageButtonName } from "./image-button";

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

/* Same lifecycle as TxButton, but rendered with the designer's ornate button art
   (baked-in text). The pending state can't change the label, so ImageButton dims
   the art and overlays a spinner instead. Use for the marquee diegetic actions
   the designer drew (e.g. Burn $PYRE). */
export function TxImageButton({
  tx,
  name,
  label,
  onClick,
  disabled,
  width = "100%",
}: {
  tx: TxLike;
  name: ImageButtonName;
  /** accessible label (visible text is baked into the art). */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  width?: number | string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ImageButton
        name={name}
        label={label}
        onClick={onClick}
        disabled={disabled}
        pending={tx.isPending}
        width={width}
      />
      {tx.isError && (
        <p className="text-danger text-xs self-stretch">{tx.error?.message ?? "Transaction failed"}</p>
      )}
      {tx.isSuccess && <p className="text-success text-xs self-stretch">Confirmed.</p>}
    </div>
  );
}
