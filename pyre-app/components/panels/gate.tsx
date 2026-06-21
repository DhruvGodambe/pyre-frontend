"use client";

/* THE GATE, the entry moment (not a feature panel). The dormant village's
   threshold: choose HOW you enter. Mirrors the intro's identity fork, so a
   returning visitor (intro already seen, no identity yet) gets the SAME
   connect-or-guest choice here as a first-timer does at the end of the lore.
   Connecting is never forced, guest is an equal path. Either choice sets an
   identity, which wakes the village (`awake = connected || isSet`) and unlocks
   everything. Spec: 05-ui-screens.md → "The Gate".
   Used by the Village shell as the dormant entry overlay. */

import { useEffect, useRef, useState } from "react";
import { useIdentity } from "@/lib/identity";
import { useWallet } from "@/lib/wallet";
import { Button, Field } from "@/components/ui/primitives";
import { shortAddress } from "@/lib/format";

export function GatePanel({ onEntered }: { onEntered?: () => void }) {
  const { mode, address, username, connectWallet, continueAsGuest, reset } = useIdentity();
  const { status } = useWallet();
  const connecting = status === "connecting";
  const [guestOpen, setGuestOpen] = useState(false);
  const [name, setName] = useState("");

  // Was an identity already set when the Gate opened? If so this is the "manage
  // your entry" visit (clicked from inside the awake village), not the dormant
  // first-entry fork, so don't auto-close; show the entry status instead.
  const startedSet = useRef(mode !== null);

  // Close the gate the instant a FRESH identity is established (dormant entry).
  // A wallet connect resolves async (connecting → connected → "wallet"); a guest
  // choice resolves immediately. Guard so it fires exactly once.
  const done = useRef(false);
  useEffect(() => {
    if (mode && !startedSet.current && !done.current) {
      done.current = true;
      onEntered?.();
    }
  }, [mode, onEntered]);

  // Already inside: show your entry, let a guest connect a wallet, offer an exit.
  if (startedSet.current) {
    return (
      <div className="py-10 px-6 space-y-4 w-[min(92vw,24rem)]">
        <div className="text-center space-y-3">
          <div className="text-5xl" aria-hidden>
            🏮
          </div>
          <h2 className="font-display text-3xl text-brand">You&rsquo;re inside the fire</h2>
          <p className="text-text-2 text-sm max-w-xs mx-auto">
            {mode === "wallet"
              ? `Connected as ${address ? shortAddress(address) : "your wallet"}. Your address is your entry.`
              : `Entering as ${username}. Connect a wallet whenever you like, or stay a guest, the quests are open either way.`}
          </p>
        </div>

        {mode === "guest" && (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="w-full text-left rounded-md bg-brand text-bg px-4 py-3 hover:bg-brand-deep transition-colors disabled:opacity-60"
          >
            <div className="text-sm font-medium">
              {connecting ? "Lighting the lantern…" : "Connect a wallet"}
            </div>
            <div className="text-bg/70 text-xs">
              Lock in your address now instead of submitting it at the end.
            </div>
          </button>
        )}

        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            onClick={() => onEntered?.()}
            className="rounded-md bg-surface-2 text-text border border-surface-3 px-5 py-2.5 text-sm hover:bg-surface-3 transition-colors"
          >
            Back to the kingdom
          </button>
          <button
            onClick={() => {
              reset();
              onEntered?.();
            }}
            className="text-text-3 text-xs hover:text-danger transition-colors"
          >
            {mode === "wallet" ? "Disconnect" : "Leave"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-6 space-y-4 w-[min(92vw,24rem)]">
      <div className="text-center space-y-3">
        <div className="text-5xl" aria-hidden>
          🏮
        </div>
        <h2 className="font-display text-3xl text-brand">The kingdom sleeps</h2>
        <p className="text-text-2 text-sm max-w-xs mx-auto">
          A single lantern burns at the gate. The fire doesn&rsquo;t demand your
          wallet, connect if you like, or enter as a guest. Either way, the
          fires wake.
        </p>
      </div>

      {!guestOpen ? (
        <div className="space-y-2">
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="w-full text-left rounded-md bg-brand text-bg px-4 py-3 hover:bg-brand-deep transition-colors disabled:opacity-60"
          >
            <div className="text-sm font-medium">
              {connecting ? "Dawn breaking…" : "Light the lantern · Connect wallet"}
            </div>
            <div className="text-bg/70 text-xs">
              Your address is your entry, there&rsquo;s nothing else to submit.
            </div>
          </button>
          <button
            onClick={() => setGuestOpen(true)}
            className="w-full text-left rounded-md bg-surface-2 text-text border border-surface-3 px-4 py-3 hover:bg-surface-3 transition-colors"
          >
            <div className="text-sm font-medium">Continue as guest</div>
            <div className="text-text-3 text-xs">
              Stay private. Pick a name now, add your wallet at the very end.
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="Choose a name" value={name} onChange={setName} placeholder="stranger" />
          <Button
            onClick={() => continueAsGuest(name)}
            disabled={name.trim().length < 2}
            className="w-full"
          >
            Enter as {name.trim() || "guest"}
          </Button>
          <button
            onClick={() => setGuestOpen(false)}
            className="w-full text-text-3 text-xs hover:text-text-2 transition-colors pt-1"
          >
            ← back to options
          </button>
        </div>
      )}
    </div>
  );
}
