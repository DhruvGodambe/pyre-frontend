"use client";

/* THE DESIGN PREVIEW CONTROL, a small fixed panel that lets the team step through
   every PHASE and JOURNEY state of the world without meeting on-chain thresholds.
   It is self-documenting: every option carries an (i) info dot whose hover popover
   spells out exactly what that mode shows, so a designer or reviewer always knows
   what they are looking at, right here in the panel.

   Two axes, matching lib/unlocks.ts:
     PHASE   = Pre-launch (sealed, Ashen Cup only) vs Launched (the unlock funnel),
               plus "Play tour" (a full guided demo, everything open).
     JOURNEY = where the visitor is in the funnel. Only meaningful once Launched;
               pre-launch every building is the same "Opens at launch".

   Selecting a journey stage also connects the mock wallet (or, for Guest,
   disconnects it) so the gated buildings show the right state immediately.
   Mock-only; hidden against real data. Each option's (i) explains what it shows. */

import { useState } from "react";
import { usePreview } from "@/lib/preview";
import { useWallet } from "@/lib/wallet";
import { useTour } from "@/lib/tour";
import { USE_MOCK } from "@/lib/config";
import type { Persona } from "@/lib/datasource";

/** A journey stage = a persona, plus a synthetic "guest" (no wallet connected). */
type Stage = Persona | "guest";

/* The launch funnel, in order. `blurb` is the (i)-hover line: what each building
   does at this point and why. Mirrors the gates in lib/unlocks.ts (Forge = holds
   $PYRE, Vault/Market = has a position, Hall = reached the Pyre tier). */
const JOURNEY: { id: Stage; label: string; blurb: string }[] = [
  {
    id: "guest",
    label: "Guest",
    blurb:
      "Not connected. The public buildings (Bonfire, Grand Exchange, Observatory) and the Ashen Cup are open; the Forge, Amber Vault, Black Market and Hall ask you to connect first.",
  },
  {
    id: "fresh",
    label: "Fresh wallet",
    blurb:
      "Brand-new visitor: connected but holds 0 $PYRE (only a little $ETH to buy with). The cold-start state, the whole earned funnel is locked and the Forge reads \"Needs $PYRE\", sending them to the Grand Exchange first.",
  },
  {
    id: "newcomer",
    label: "Holder",
    blurb:
      "A funded test wallet (1,000,000 $PYRE + 100 $ETH) that has bought but not yet staked or burned. The Forge opens; this is the wallet for testing the full stake, burn, tier-climb and LP-burn flow. Amber Vault, Black Market and the Hall stay locked until it takes a position.",
  },
  {
    id: "burner",
    label: "Staker + Burner",
    blurb:
      "Has a position: staking to earn $ETH and burning to climb tiers (mid-tier, Flame). The Forge, Amber Vault and Black Market are open. The Hall stays locked until you burn past the Pyre tier.",
  },
  {
    id: "veteran",
    label: "Pyre / Immolated",
    blurb:
      "Top tier and ascended. Every building is open, including the Hall of the Immolated. The full, unlocked world.",
  },
];

const PHASE_INFO: Record<"prelaunch" | "launched", string> = {
  prelaunch:
    "The fire isn't lit. Only the Ashen Cup is live (quests + Points toward launch rewards); every other building reads \"Opens at launch\". A visitor's holdings make no difference here.",
  launched:
    "The world opens. The public buildings (Bonfire, Grand Exchange, Observatory) are open to everyone; the earned buildings unlock by the visitor's Journey below.",
};

const TOUR_INFO =
  "Runs the full guided demo: every building open and populated, with the Emberkeeper narrating, in the current phase's tense (future before launch, present after).";

/* A small "i" badge whose hover/focus popover shows `text`. Inherits the current
   text colour so it reads on both selected (brand) and idle buttons; the popover
   itself is solid so it's legible over anything. Opens upward (the panel sits at
   the bottom-left of the screen). */
function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/info relative inline-flex shrink-0">
      <span
        tabIndex={0}
        className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-current text-[9px] font-semibold leading-none opacity-60 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 hidden w-56 rounded-md border border-surface-3 bg-bg/95 px-2.5 py-1.5 text-left text-[11px] font-normal leading-snug text-text-2 shadow-panel backdrop-blur group-hover/info:block group-focus-within/info:block"
      >
        {text}
      </span>
    </span>
  );
}

export function PreviewSwitcher() {
  const { persona, setPersona, launched, setLaunched } = usePreview();
  const { status, connect, disconnect } = useWallet();
  const tour = useTour();
  // Local highlight so "Guest" (which has no persona) can be the active stage.
  const [stage, setStage] = useState<Stage>(persona);

  if (!USE_MOCK) return null;

  const connected = status === "connected";

  const selectStage = (s: Stage) => {
    setStage(s);
    if (s === "guest") {
      disconnect(); // show the launch "Connect your wallet" wall
      return;
    }
    setPersona(s);
    if (!connected) connect(); // populate the gated panels
  };

  const phaseBtn = (active: boolean) =>
    `flex flex-1 items-center justify-between gap-1 rounded-sm px-2 py-1 text-xs transition-colors duration-fast ${
      active ? "bg-brand text-bg" : "bg-surface text-text-2 hover:text-text"
    }`;

  return (
    <div className="fixed bottom-3 left-3 z-40 w-[20rem] max-w-[calc(100vw-1.5rem)] space-y-2.5 rounded-lg border border-surface-3 bg-surface-2/95 px-3 py-2.5 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-text-3">
          Design preview
        </div>
        {/* Full guided demo (every building open). The (i) explains the tense. */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={tour.start}
            className="rounded-sm bg-brand/15 px-2 py-0.5 text-[11px] text-brand transition-colors duration-fast hover:bg-brand/25"
          >
            ▶ Play tour
          </button>
          <InfoDot text={TOUR_INFO} />
        </div>
      </div>

      {/* PHASE */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-text-3">
          Phase
        </div>
        <div className="flex gap-1">
          <button onClick={() => setLaunched(false)} className={phaseBtn(!launched)}>
            <span>Pre-launch</span>
            <InfoDot text={PHASE_INFO.prelaunch} />
          </button>
          <button onClick={() => setLaunched(true)} className={phaseBtn(launched)}>
            <span>Launched</span>
            <InfoDot text={PHASE_INFO.launched} />
          </button>
        </div>
      </div>

      {/* JOURNEY (only drives the world once Launched; the (i) on each stays
          readable in any phase so the team can study the whole funnel). */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-text-3">
          Journey {launched ? "" : "· begins at launch"}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {JOURNEY.map((j) => (
            <button
              key={j.id}
              onClick={() => selectStage(j.id)}
              className={`flex items-center justify-between gap-1 rounded-sm px-2 py-1 text-left text-xs transition-colors duration-fast ${
                stage === j.id && launched
                  ? "bg-brand text-bg"
                  : "bg-surface text-text-2 hover:text-text"
              }`}
            >
              <span className="leading-tight">{j.label}</span>
              <InfoDot text={j.blurb} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
