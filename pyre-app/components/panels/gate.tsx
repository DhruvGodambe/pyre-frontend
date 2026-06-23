"use client";

/* THE GATE, the entry moment (not a feature panel). The dormant village's
   threshold: choose HOW you enter. Mirrors the intro's identity fork, so a
   returning visitor (intro already seen, no identity yet) gets the SAME
   connect-or-guest choice here as a first-timer does at the end of the lore.
   Connecting is never forced, guest is an equal path. Either choice sets an
   identity, which wakes the village (`awake = connected || isSet`) and unlocks
   everything. Spec: 05-ui-screens.md → "The Gate".
   Used by the Village shell as the dormant entry overlay. */

import { useEffect, useRef } from "react";
import { useIdentity } from "@/lib/identity";
import { useWallet } from "@/lib/wallet";
import { EntryFork } from "@/components/ui/entry-fork";
import { shortAddress } from "@/lib/format";

export function GatePanel({ onEntered }: { onEntered?: () => void }) {
  const { mode, address, username, connectWallet, reset } = useIdentity();
  const { status } = useWallet();
  const connecting = status === "connecting";

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
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 ring-1 ring-brand/30">
            <span className="text-2xl" aria-hidden>✦</span>
          </span>
          <h2 className="font-display text-3xl text-brand">You&rsquo;re in</h2>
          <p className="text-text-2 text-sm max-w-xs mx-auto">
            {mode === "wallet"
              ? `Connected as ${address ? shortAddress(address) : "your wallet"}. Your address is your account.`
              : `Signed in as ${username}. Connect a wallet whenever you like, or stay a guest, the quests work either way.`}
          </p>
        </div>

        {mode === "guest" && (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="w-full text-left rounded-md bg-brand text-bg px-4 py-3 hover:bg-brand-deep transition-colors disabled:opacity-60"
          >
            <div className="text-sm font-medium">
              {connecting ? "Connecting…" : "Connect a wallet"}
            </div>
            <div className="text-bg/70 text-xs">
              Add your address now instead of submitting it at the end.
            </div>
          </button>
        )}

        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            onClick={() => onEntered?.()}
            className="rounded-md bg-surface-2 text-text border border-surface-3 px-5 py-2.5 text-sm hover:bg-surface-3 transition-colors"
          >
            Back to the app
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
    <div className="py-9 px-7 w-[min(92vw,25rem)]">
      <EntryFork />
    </div>
  );
}
