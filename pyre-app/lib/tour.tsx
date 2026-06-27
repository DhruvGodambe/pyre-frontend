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
import { usePreview } from "@/lib/preview";
import { useNavigation } from "@/lib/navigation";

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
  /** Pre-launch narration: same beat, future tense (the building is a sealed
      preview, so "at launch you'll..." not "stake here now"). Falls back to
      `text` when unset. Picked via LAUNCHED at build time, see `say()`. */
  preText?: string;
  /** path (via asset()) to the Tutor's spoken clip for this beat; undefined = silent. */
  voice?: string;
  /** Optional art (via asset()) shown rising from behind the narration box for
      this beat, e.g. the Acolyte NFT on the "create your Acolyte" line. */
  art?: string;
}

/* Before launch the world is a sealed preview, so the tour speaks in future
   tense and sells what's coming; at launch it speaks in the present and walks
   you through doing it. The `launched` flag (from the launch phase) flips every
   line; buildBeats() rebuilds the walk for the current phase. */
const say = (l: TourLine, launched: boolean): string =>
  launched ? l.text : l.preText ?? l.text;

/* An inside beat just narrates what you do in this building while its real
   interior is open behind the Emberkeeper. One inside beat can have several
   steps (e.g. "stake, then burn"); the tour does NOT spotlight any UI section,
   it only steps inside and talks. */
export type TourInsideStep = TourLine;

const LINES: Record<BuildingId, { outside: TourLine; inside: TourInsideStep[] }> = {
  bonfire: {
    outside: {
      text: "Let's start at the center: the Bonfire. Every $PYRE anyone burns shows up here.",
      preText: "Let's start at the center: the Bonfire. Every $PYRE anyone burns will show up here, live.",
    },
    inside: [
      {
        text: "This is the total $PYRE burned across everyone, updating live.",
        preText: "This will be the total $PYRE burned across everyone, updating live once the fire is lit.",
      },
    ],
  },
  forge: {
    outside: {
      text: "The Forge is where you stake $PYRE to earn ETH (and stop decay), and burn $PYRE to create your Acolyte NFT. Let's go in.",
      preText: "The Forge is where you'll stake $PYRE to earn ETH (and stop decay), and burn $PYRE to create your Acolyte NFT. Take a look inside.",
    },
    inside: [
      {
        text: "First, stake your $PYRE here. That stops decay and starts earning you ETH.",
        preText: "This is where you'll stake your $PYRE. That stops decay and starts earning you ETH.",
      },
      {
        text: "Then burn $PYRE here to create your Acolyte NFT, which multiplies that ETH yield up to 3×.",
        preText: "Then you'll burn $PYRE here to create your Acolyte NFT, which multiplies that ETH yield up to 3×.",
        art: "/world/acolytes/acolyte.png",
      },
      {
        text: "Your Acolyte climbs four tiers as you burn more, all right here at the Forge: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×). Keep burning beyond Pyre and you ascend to the rarest form of all, the Immolated Acolyte, the highest rank in the village. Its Hall sits above.",
        preText: "Your Acolyte will climb four tiers as you burn more, all from the Forge: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×). Keep burning beyond Pyre and you'll ascend to the rarest form of all, the Immolated Acolyte, the highest rank in the village. Its Hall sits above.",
      },
    ],
  },
  vault: {
    outside: { text: "Your personal dashboard: the Amber Vault." },
    inside: [
      {
        text: "Everything that's yours lives here: your Acolyte, your balances and your yield, with quick ways back to the action.",
        preText: "Everything that's yours will live here: your Acolyte, your balances and your yield, with quick ways back to the action.",
      },
    ],
  },
  observatory: {
    outside: { text: "Live project stats: the Observatory." },
    inside: [
      {
        text: "From here you read the whole protocol at a glance: supply, decay, burns and yield. No wallet needed to look.",
        preText: "You'll read the whole protocol here at a glance: supply, decay, burns and yield. No wallet needed to look.",
      },
    ],
  },
  exchange: {
    outside: {
      text: "Where you trade: the Grand Exchange.",
      preText: "Where you'll trade: the Grand Exchange.",
    },
    inside: [
      {
        text: "Swap ETH and $PYRE here, with every fee shown upfront.",
        preText: "You'll swap ETH and $PYRE here, with every fee shown upfront.",
      },
    ],
  },
  market: {
    outside: { text: "Buy and sell NFTs: the Black Market." },
    inside: [
      {
        text: "Browse and buy Acolytes that other people have created.",
        preText: "You'll browse and buy Acolytes that other people have created.",
      },
    ],
  },
  immolated: {
    outside: { text: "For top holders: the Hall of the Immolated." },
    inside: [
      {
        text: "When your burning at the Forge lifts you past Pyre into the Immolated, this Hall opens to you: ascend here to take the highest rank in the village, with the strongest pull on the yield.",
        preText: "When your burning at the Forge lifts you past Pyre into the Immolated, this Hall opens to you: ascend here to take the highest rank in the village, with the strongest pull on the yield.",
      },
    ],
  },
  tavern: {
    outside: {
      text: "And the Ashen Cup, where you earn rewards before launch.",
      preText: "And last, the Ashen Cup. When the tour ends, this is where you begin: complete quests to earn rewards before launch.",
    },
    inside: [
      {
        text: "Here are the quests. Complete them to earn Points and climb the leaderboard. Let's do your first.",
        preText: "Here are the quests, open right now. Complete them to earn Points, climb the leaderboard and lock in your place before the gates open. Let's do your first.",
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
  /** art shown rising from behind the narration box for this beat (the Acolyte NFT). */
  art?: string;
  /** position in the walk (1-based) and the total, for a progress read. */
  step: number;
  total: number;
}

/* The opening establishing shot: the camera stays wide on the whole kingdom while
   the Emberkeeper sets the scene, before the first zoom to the Bonfire. */
const OVERVIEW_LINE: TourLine = {
  text: "Welcome to PYRE. I'm the Emberkeeper: I tend the flame at the heart of this village and guide every newcomer through it. The idea here is simple: stake and burn $PYRE to earn ETH yield and raise your Acolyte NFT. Come, let me show you around, building by building.",
  preText: "Welcome to PYRE. I'm the Emberkeeper: I tend the flame at the heart of this village and guide every newcomer through it. The idea here is simple: stake and burn $PYRE to earn ETH yield and raise your Acolyte NFT. Let me show you what's coming, and how to earn your place before the gates open.",
};

/* Build the whole walk for the current launch phase. Pre-launch beats speak in
   future tense (sealed previews); launched beats walk you through doing it. */
function buildBeats(launched: boolean): TourBeat[] {
  return [
    {
      phase: "outside",
      overview: true,
      text: say(OVERVIEW_LINE, launched),
      step: 0,
      total: ORDER.length,
    },
    ...ORDER.flatMap((building, i) => {
      const l = LINES[building];
      const base = { building, step: i + 1, total: ORDER.length };
      const outside: TourBeat = { ...base, phase: "outside", text: say(l.outside, launched), voice: l.outside.voice };
      const inside: TourBeat[] = l.inside.map((s) => ({
        ...base,
        phase: "inside",
        text: say(s, launched),
        voice: s.voice,
        art: s.art,
      }));
      return [outside, ...inside];
    }),
  ];
}

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
  const { launched } = usePreview();
  const { navigate } = useNavigation();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  // The walk is rebuilt for the current launch phase, so flipping Pre-launch ↔
  // Launched (live, in mock) re-narrates the tour in the right tense.
  const beats = useMemo(() => buildBeats(launched), [launched]);

  // Every exit from the tour (finishing the last beat OR skipping) lands the
  // visitor in the Ashen Cup quests, the one live action. Without this the tour
  // just stops on the bare map and the funnel's whole point is lost.
  const endInAshenCup = useCallback(() => {
    setActive(false);
    navigate({ building: "tavern", tab: "rites" });
  }, [navigate]);

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);
  const next = useCallback(() => {
    if (index >= beats.length - 1) endInAshenCup();
    else setIndex((i) => i + 1);
  }, [index, beats.length, endInAshenCup]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const skip = useCallback(() => endInAshenCup(), [endInAshenCup]);

  const value = useMemo<TourValue>(
    () => ({
      active,
      index,
      beat: active ? beats[index] : null,
      isLastBeat: index >= beats.length - 1,
      start,
      next,
      back,
      skip,
    }),
    [active, index, beats, start, next, back, skip]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}
