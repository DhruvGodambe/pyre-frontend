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
import { GameIcon } from "@/components/ui/game-icon";
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
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 ring-1 ring-brand/30 shadow-[0_0_28px_-6px_rgba(240,169,59,0.6)]">
            <GameIcon name={mode === "wallet" ? "wallet" : "guest"} size={30} alt="" />
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
            className="group/row flex w-full items-center gap-3.5 rounded-lg bg-gradient-to-b from-brand to-brand-deep px-4 py-3 text-left text-bg shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] transition-all duration-fast hover:brightness-110 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-bg/15">
              <GameIcon name="wallet" size={26} alt="" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-tight">
                {connecting ? "Connecting…" : "Connect a wallet"}
              </span>
              <span className="block text-bg/70 text-xs mt-0.5">
                Add your address now instead of submitting it at the end.
              </span>
            </span>
            <span className="ml-auto shrink-0 text-lg text-bg/70 transition-transform duration-fast group-hover/row:translate-x-0.5" aria-hidden>
              →
            </span>
          </button>
        )}

        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            onClick={() => onEntered?.()}
            className="rounded-md bg-surface-2 text-text border border-surface-3 px-5 py-2.5 text-sm hover:bg-surface-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Back to the app
          </button>
          <button
            onClick={() => {
              reset();
              onEntered?.();
            }}
            className="rounded-md text-text-3 text-xs px-2 py-1 hover:text-danger transition-colors outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
