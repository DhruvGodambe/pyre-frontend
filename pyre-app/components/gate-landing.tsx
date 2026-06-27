"use client";

/* THE GATE LANDING, the first thing a visitor sees (desktop), once the brand
   film is done. You arrive at the Gate exterior, the Emberkeeper sets the scene
   (the lore, as narration over the gate, not a separate modal), then you choose
   how to enter, right here on the gate. Choosing wakes the village; the landing
   cross-fades away and, on a first visit, the guided tour takes over.

   Shows whenever there is NO identity yet (awake === false). A returning visitor
   whose name/wallet persisted skips it entirely and lands in the village. The
   lore beats only play on a true first visit; after that it's just the entry
   fork over the gate. */

import { useEffect, useState } from "react";
import Image from "next/image";
import { BUILDING_BY_ID } from "@/components/buildings";
import { EntryFork } from "@/components/ui/entry-fork";
import { useTour } from "@/lib/tour";
import { useCodex } from "@/lib/codex";
import { asset } from "@/lib/config";
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

export function GateLanding({
  leaving,
  onDone,
}: {
  /** the village has woken (identity chosen): fade out, then unmount. */
  leaving: boolean;
  onDone: () => void;
}) {
  const tour = useTour();
  const codex = useCodex();
  const gate = BUILDING_BY_ID.gate;

  // First true visit → play the lore beats; afterwards go straight to the fork.
  const [firstTime, setFirstTime] = useState(false);
  const [loreStep, setLoreStep] = useState(0);
  const [loreDone, setLoreDone] = useState(true);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const fresh = !storageGet(SEEN_KEY);
    setFirstTime(fresh);
    setLoreDone(!fresh);
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Once the village wakes, fade the gate out, then hand control back (which
  // starts the tour for first-timers) and unmount.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      // The "intro" rite is the guided TOUR now, credited when it's FINISHED
      // (see tour-ui.tsx), so we only start the tour here, not grant it.
      if (firstTime) tour.start();
      storageSet(SEEN_KEY, "1");
      onDone();
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, firstTime]);

  const lore = LORE[loreStep];
  const lastLore = loreStep >= LORE.length - 1;

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden bg-bg transition-opacity duration-[650ms]"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      {/* The gate, full-screen, with a slow settle as you arrive. */}
      <div
        className="absolute inset-0 transition-[transform,opacity] duration-[1200ms] ease-out"
        style={{ transform: shown ? "scale(1)" : "scale(1.08)", opacity: shown ? 1 : 0 }}
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

      {/* Wordmark */}
      <div className="absolute top-5 left-6 z-10">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          PYRE
        </span>
      </div>

      {/* Content: the Emberkeeper's lore first (first visit), then the fork. */}
      <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-4 sm:p-8">
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
        ) : (
          <div className="animate-entry w-full max-w-md rounded-2xl bg-surface/80 border border-brand/20 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-inset ring-white/5 py-9 px-7">
            <div className="h-px -mt-3 mb-6 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <EntryFork />
          </div>
        )}
      </div>
    </div>
  );
}
