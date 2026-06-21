"use client";

/* ============================================================================
   PYRE, Guided world tour  (the real, interactive onboarding)
   ----------------------------------------------------------------------------
   Replaces the old click-through card deck. The Emberkeeper walks a first-time
   visitor through the ACTUAL village: the camera pans/zooms to each building
   (outside beat), then steps INSIDE it (inside beat) with a line on what you do
   there, ending in the Ashen Cup, where the first rite happens in place.

   This is a shared state machine. Both shells read it and drive the world their
   own way: the VillageShell moves the camera + opens interiors; the MobileShell
   (later) scrolls + opens the stacked panels. The narration is identical.

   The tour runs in the AWAKE village (identity already chosen at the Gate / in
   the intro), so the interiors render real content instead of a connect wall.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BuildingId } from "@/components/buildings";

export type TourPhase = "outside" | "inside";

/* The walk: a ring around the fire, ending at the Tavern (the funnel). The Gate
   is excluded, it's the entry, already used to wake the village. */
const ORDER: BuildingId[] = [
  "bonfire",
  "forge",
  "vault",
  "observatory",
  "exchange",
  "market",
  "immolated",
  "tavern",
];

/* A Tutor line = the words shown + an OPTIONAL voice clip. The Emberkeeper (the
   guide character) is being designed to actually TALK, text AND voice, so every
   beat carries a `voice` slot. When the designer delivers the audio, drop the file
   in /public/world/voice/ and set `voice: "/world/voice/<file>.mp3"` here; the
   narration plays it automatically (with a mute toggle). No code change needed. */
export interface TourLine {
  text: string;
  /** path (via asset()) to the Tutor's spoken clip for this beat; undefined = silent. */
  voice?: string;
}

/* An inside step ALSO points at the actual UI: `highlight` is the DOM id of the
   section the line is about (e.g. the Forge's Stake box), which the tour glows /
   spotlights so the visitor sees exactly where the action lives. One inside beat
   can have several steps, "stake HERE, then burn HERE". Buildings with no single
   actionable box (Bonfire, Observatory, Market) just describe, no highlight. */
export interface TourInsideStep extends TourLine {
  /** DOM id of the UI section this step is about. Must be set on that element. */
  highlight?: string;
}

const LINES: Record<BuildingId, { outside: TourLine; inside: TourInsideStep[] }> = {
  bonfire: {
    outside: { text: "Start at the heart. Every $PYRE fed to the fire feeds this flame." },
    inside: [
      {
        text: "Inside, the global burn counter climbs in real time. This is the pulse of the whole kingdom.",
      },
    ],
  },
  forge: {
    outside: {
      text: "The Forge is where you stake $PYRE to shield it from decay, and where Pyre Acolytes (NFTs) are earned by burning. Come, step in.",
    },
    inside: [
      {
        text: "First, stake your $PYRE here. It stops the decay and starts earning you ETH.",
        highlight: "forge-stake",
      },
      {
        text: "Then burn $PYRE here to forge your Acolyte, which multiplies that ETH yield up to 3×.",
        highlight: "forge-burn",
      },
      {
        text: "Your Acolyte climbs four tiers as you burn more: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×). A fifth tier, the Immolated Acolyte, waits in the Hall above.",
        highlight: "forge-ladder",
      },
    ],
  },
  vault: {
    outside: { text: "Your own hold sits here: the Amber Vault." },
    inside: [
      {
        text: "Everything that's yours lives here: your Acolyte, your balances and your yield, with quick ways back to the action.",
        highlight: "vault-actions",
      },
    ],
  },
  observatory: {
    outside: { text: "The watchtower, the Observatory." },
    inside: [
      {
        text: "From here you read the whole protocol at a glance: supply, decay, burns and yield. No wallet needed to look.",
      },
    ],
  },
  exchange: {
    outside: { text: "The trading floor: the Grand Exchange." },
    inside: [
      {
        text: "Swap ETH and $PYRE right here, every fee shown to you honestly. Nothing hidden in the dark.",
        highlight: "exchange-swap",
      },
    ],
  },
  market: {
    outside: { text: "The bazaar, the Black Market." },
    inside: [{ text: "Browse and claim the Acolytes other wallets have forged in the flame." }],
  },
  immolated: {
    outside: { text: "Above it all, the Hall of the Immolated." },
    inside: [
      {
        text: "Reach Pyre Acolyte, then burn again here to become an Immolated Acolyte and claim a deeper share of the fire.",
        highlight: "immolated-action",
      },
    ],
  },
  tavern: {
    outside: { text: "And the reason you came early: the Ashen Cup." },
    inside: [
      {
        text: "And here are the quests. Complete them to earn Embers and climb the leaderboard. Let's do your first.",
        highlight: "tavern-rites",
      },
    ],
  },
  gate: { outside: { text: "" }, inside: [] },
};

export interface TourBeat {
  /** absent on the opening overview beat (the whole-map establishing shot). */
  building?: BuildingId;
  phase: TourPhase;
  /** the opening beat: whole map in view, kingdom lore, no zoom yet. */
  overview?: boolean;
  text: string;
  /** the Tutor's spoken clip for this beat, if delivered. */
  voice?: string;
  /** DOM id of the UI section to glow/spotlight for this beat (inside beats). */
  highlight?: string;
  /** position in the walk (1-based) and the total, for a progress read. */
  step: number;
  total: number;
}

/* The opening establishing shot: the camera stays wide on the whole kingdom while
   the Emberkeeper sets the scene, before the first zoom to the Bonfire. */
const OVERVIEW_BEAT: TourBeat = {
  phase: "outside",
  overview: true,
  text: "Look upon the Pyre kingdom. Every road leads to the fire at its heart: feed it $PYRE and it rewards you, in ETH yield and in Acolytes forged from the flame. Come, let me show you each door.",
  step: 0,
  total: ORDER.length,
};

const BEATS: TourBeat[] = [
  OVERVIEW_BEAT,
  ...ORDER.flatMap((building, i) => {
    const l = LINES[building];
    const base = { building, step: i + 1, total: ORDER.length };
    const outside: TourBeat = { ...base, phase: "outside", text: l.outside.text, voice: l.outside.voice };
    const inside: TourBeat[] = l.inside.map((s) => ({
      ...base,
      phase: "inside",
      text: s.text,
      voice: s.voice,
      highlight: s.highlight,
    }));
    return [outside, ...inside];
  }),
];

interface TourValue {
  active: boolean;
  index: number;
  beat: TourBeat | null;
  isLastBeat: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
}

const TourContext = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);
  const next = useCallback(
    () =>
      setIndex((i) => {
        if (i >= BEATS.length - 1) {
          setActive(false);
          return i;
        }
        return i + 1;
      }),
    []
  );
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const skip = useCallback(() => setActive(false), []);

  const value = useMemo<TourValue>(
    () => ({
      active,
      index,
      beat: active ? BEATS[index] : null,
      isLastBeat: index >= BEATS.length - 1,
      start,
      next,
      back,
      skip,
    }),
    [active, index, start, next, back, skip]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}
