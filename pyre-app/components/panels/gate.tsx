"use client";

/* THE GATE — the entry moment (not a feature panel). Pre-connect: the village is
   dormant. On connect: it wakes. Spec: 05-ui-screens.md → "The Gate".
   Used by the Village shell as the entry overlay; on mobile it's the header. */

import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/primitives";

export function GatePanel() {
  const { status, connect } = useWallet();
  return (
    <div className="text-center py-12 space-y-4">
      <div className="text-5xl" aria-hidden>
        🏮
      </div>
      <h2 className="font-display text-3xl text-brand">The village sleeps</h2>
      <p className="text-text-2 text-sm max-w-xs mx-auto">
        A single lantern burns at the gate. Light it, and the fires wake. Dawn breaks over the
        village.
      </p>
      <Button onClick={connect} disabled={status === "connecting"}>
        {status === "connecting" ? "Dawn breaking…" : "Light the lantern · Connect"}
      </Button>
    </div>
  );
}
