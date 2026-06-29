"use client";

/* THE GATE LANDING, the first thing a visitor sees (desktop), once the brand
   film is done. You arrive at the Gate exterior, the Emberkeeper sets the scene
   (the lore, as narration over the gate, not a separate modal), then you choose
   how to enter, right here on the gate.

   Entry is a deliberate THREE-beat flow, so stepping into the world feels like
   an arrival, not a flicker:
     1. lore  → (first visit only) the Emberkeeper's opening.
     2. fork  → connect a wallet or continue as a guest.
     3. ENTER → once an identity is set, the fork gives way to a "you're in"
                confirmation (the connected address / guest name) with a single
                Enter button. Pressing it plays the gate's door and pushes the
                camera THROUGH the gate, bright bloom and all, revealing the
                woken village behind it.

   Shows whenever there is NO identity yet (awake === false). A returning visitor
   whose name/wallet persisted skips it entirely and lands in the village. The
   lore beats only play on a true first visit; after that it's just the entry
   fork over the gate. */

import { useEffect, useState } from "react";
import Image from "next/image";
import { BUILDING_BY_ID } from "@/components/buildings";
import { EntryFork } from "@/components/ui/entry-fork";
import { GameIcon } from "@/components/ui/game-icon";
import { useTour } from "@/lib/tour";
import { useCodex } from "@/lib/codex";
import { useIdentity } from "@/lib/identity";
import { asset } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { playDoor } from "@/lib/sfx";
import { storageGet, storageSet } from "@/lib/safe-storage";

const SEEN_KEY = "pyre_intro_seen";

/* The Emberkeeper's opening, delivered over the gate. Same substance as the old
   lore cards, now spoken at the threshold. */
const LORE = [
  {
    title: "Welcome to PYRE.",
    body:
      "PYRE is built around one idea: $PYRE is a token made to be burned. Stake and burn it to earn $ETH yield and level up your Acolyte NFT.",
  },
  {
    title: "You’re early.",
    body:
      "Not many have found this yet, and the early are rewarded. There are quests in these first days, and what they unlock is revealed closer to launch.",
    docs: true,
  },
  {
    title: "Step up to the gate.",
    body:
      "I’m the Emberkeeper, your guide. Choose how you’ll enter, and I’ll walk you through the village, building by building.",
  },
];

export function GateLanding({ onDone }: { onDone: () => void }) {
  const tour = useTour();
  const codex = useCodex();
  const identity = useIdentity();
  const gate = BUILDING_BY_ID.gate;

  // First true visit → play the lore beats; afterwards go straight to the fork.
  const [firstTime, setFirstTime] = useState(false);
  const [loreStep, setLoreStep] = useState(0);
  const [loreDone, setLoreDone] = useState(true);
  const [shown, setShown] = useState(false);
  // The user pressed Enter: run the push-through transition, then unmount.
  const [departing, setDeparting] = useState(false);

  useEffect(() => {
    const fresh = !storageGet(SEEN_KEY);
    setFirstTime(fresh);
    setLoreDone(!fresh);
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // An identity exists (wallet connected or guest name set): we're at the Enter
  // beat. Until the user presses Enter we DON'T leave, the confirmation lingers
  // so the arrival is a chosen step, not an automatic flicker.
  const ready = identity.isSet;

  // Press Enter → door sound, then the push-through transition plays for ~1.05s
  // before we start the tour (first-timers) and unmount.
  const enter = () => {
    if (departing) return;
    playDoor("gate"); // same random door bank as every building
    setDeparting(true);
    setTimeout(() => {
      if (firstTime) tour.start();
      storageSet(SEEN_KEY, "1");
      onDone();
    }, 1050);
  };

  const lore = LORE[loreStep];
  const lastLore = loreStep >= LORE.length - 1;

  const enterLabel = identity.username
    ? `Welcome, ${identity.username}`
    : "Wallet connected";
  const enterSub = identity.address
    ? shortAddress(identity.address)
    : "Your guest pass is ready.";

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden bg-bg transition-opacity duration-[1000ms] ease-out"
      style={{ opacity: departing ? 0 : 1 }}
    >
      {/* The gate, full-screen, with a slow settle as you arrive, then a push
          THROUGH it (scale up) as you step into the world. */}
      <div
        className="absolute inset-0 transition-[transform,opacity] ease-out"
        style={{
          transform: departing ? "scale(1.6)" : shown ? "scale(1)" : "scale(1.08)",
          opacity: shown ? 1 : 0,
          transitionDuration: departing ? "1050ms" : "1200ms",
        }}
      >
        {gate.interior && (
          <Image
            src={asset(gate.interior)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none"
          />
        )}
      </div>
      {/* Legibility: a soft vignette + bottom scrim under the content. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_30%,rgba(11,10,9,0.72)_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/60 to-transparent pointer-events-none" />

      {/* Warm ember bloom: blooms from the centre as you cross the threshold, so
          stepping through the gate flares with firelight before it clears. */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(240,169,59,0.55),transparent_60%)] transition-opacity duration-[900ms] ease-out"
        style={{ opacity: departing ? 1 : 0 }}
      />

      {/* Wordmark */}
      <div className="absolute top-5 left-6 z-10">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          PYRE
        </span>
      </div>

      {/* Content: lore (first visit) → entry fork → Enter confirmation. Hidden
          once we're departing so nothing rides over the transition. */}
      <div
        className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-4 sm:p-8 transition-opacity duration-300"
        style={{ opacity: departing ? 0 : 1 }}
      >
        {!loreDone ? (
          <div key={loreStep} className="animate-entry w-full max-w-xl text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-brand text-lg" aria-hidden>
                ✦
              </span>
              <span className="text-text-3 text-[11px] uppercase tracking-[0.25em]">
                The Emberkeeper
              </span>
            </div>
            <h2 className="font-display text-4xl text-brand drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {lore.title}
            </h2>
            <p className="text-text mt-3 text-base leading-relaxed max-w-lg mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
              {lore.body}
            </p>
            {lore.docs && (
              <button
                onClick={() => codex.open()}
                className="inline-block mt-2 text-brand text-sm hover:text-brand-soft transition-colors"
              >
                Open the Ember Codex →
              </button>
            )}
            <div className="mt-6 flex items-center justify-center gap-4">
              {loreStep > 0 && (
                <button
                  onClick={() => setLoreStep((s) => Math.max(0, s - 1))}
                  className="text-text-3 text-sm hover:text-text-2 transition-colors px-3 py-2"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => (lastLore ? setLoreDone(true) : setLoreStep((s) => s + 1))}
                className="rounded-lg bg-gradient-to-b from-brand to-brand-deep text-bg px-7 py-3 text-sm font-medium shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] hover:brightness-110 transition-all"
              >
                {lastLore ? "Step up to the gate →" : "Continue"}
              </button>
            </div>
          </div>
        ) : !ready ? (
          <div className="animate-entry w-full max-w-md rounded-2xl bg-surface/80 border border-brand/20 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-inset ring-white/5 py-9 px-7">
            <div className="h-px -mt-3 mb-6 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <EntryFork />
          </div>
        ) : (
          /* ENTER beat: identity confirmed, one door left to open. */
          <div className="animate-entry w-full max-w-md rounded-2xl bg-surface/80 border border-brand/20 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-inset ring-white/5 py-9 px-7 text-center">
            <div className="h-px -mt-3 mb-6 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/12 ring-1 ring-brand/30 shadow-[0_0_28px_-6px_rgba(240,169,59,0.6)]">
              <GameIcon name={identity.username ? "guest" : "wallet"} size={30} />
            </span>
            <h2 className="font-display text-3xl text-brand leading-none mt-4">{enterLabel}</h2>
            <p className="mt-2 text-text-3 text-sm">{enterSub}</p>
            <p className="mt-4 text-text-2 text-sm leading-relaxed max-w-xs mx-auto">
              The fire is lit and the village is awake. Step through the gate.
            </p>
            <button
              onClick={enter}
              className="mt-6 w-full rounded-lg bg-gradient-to-b from-brand to-brand-deep text-bg px-7 py-3.5 text-base font-medium shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] hover:brightness-110 transition-all"
            >
              Enter Pyre Kingdom →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
