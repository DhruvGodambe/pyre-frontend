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

/* The walk, ordered to follow the real user journey and to flow building to
   building (each stop hands off to the next): the heart of the fire, then how you
   get $PYRE, then what you do with it, its pinnacle, where you track it, trading,
   the wide view, and finally the one live door, the Ashen Cup. The Gate is
   excluded, it's the entry, already used to wake the village. */
const ORDER: BuildingId[] = [
  "bonfire",
  "exchange",
  "forge",
  "immolated",
  "vault",
  "market",
  "observatory",
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
  // 1. The heart of the fire, the theme of the whole place.
  bonfire: {
    outside: {
      text: "Let's begin at the heart of it all: the Bonfire, burning at the center of the village. Every $PYRE anyone sends to the fire shows up here.",
      preText: "Let's begin at the heart of it all: the Bonfire, burning at the center of the village. Every $PYRE anyone sends to the fire will show up here, live.",
    },
    inside: [
      {
        text: "This is the total $PYRE burned across everyone, climbing in real time. The whole village turns around this fire.",
        preText: "This will be the total $PYRE burned across everyone, climbing in real time once the fire is lit. The whole village turns around this fire.",
      },
    ],
  },
  // 2. The on-ramp: first you need $PYRE.
  exchange: {
    outside: {
      text: "Before you can take part, you'll need some $PYRE of your own. Follow me, this way to the Grand Exchange.",
      preText: "Before you can take part, you'll need some $PYRE of your own. Follow me, this way to the Grand Exchange.",
    },
    inside: [
      {
        text: "Swap your ETH for $PYRE right here, with every fee shown upfront. This is your way in.",
        preText: "You'll swap your ETH for $PYRE right here, with every fee shown upfront. This is your way in.",
      },
    ],
  },
  // 3. The core loop: stake to earn, burn to rise. Ends by handing off to the Hall.
  forge: {
    outside: {
      text: "Now, with $PYRE in hand, come with me to the Forge. This is where the real work happens. Let's step inside.",
      preText: "Now, with $PYRE in hand, this is the Forge, where the real work will happen. Let's step inside.",
    },
    inside: [
      {
        text: "First, stake your $PYRE here. That stops it decaying and starts earning you ETH.",
        preText: "First, you'll stake your $PYRE here. That stops it decaying and starts earning you ETH.",
      },
      {
        text: "Then burn $PYRE here to forge your Acolyte NFT, which multiplies that ETH yield up to 3×.",
        preText: "Then you'll burn $PYRE here to forge your Acolyte NFT, which multiplies that ETH yield up to 3×.",
        art: "/world/acolytes/acolyte.png",
      },
      {
        text: "Your Acolyte climbs four tiers as you burn more, all from the Forge: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×). And burn past Pyre, and you ascend to the rarest form of all, the Immolated. Come, let me take you to their Hall.",
        preText: "Your Acolyte will climb four tiers as you burn more, all from the Forge: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×). And burn past Pyre, and you'll ascend to the rarest form of all, the Immolated. Come, let me take you to their Hall.",
      },
    ],
  },
  // 4. The pinnacle, straight off the Forge's tier ladder.
  immolated: {
    outside: {
      text: "Here it is: the Hall of the Immolated, home to the rarest Acolytes in the village.",
      preText: "Here it is: the Hall of the Immolated, home to the rarest Acolytes in the village.",
    },
    inside: [
      {
        text: "Burn past Pyre at the Forge and you ascend here, to the Immolated: the highest rank of all, with the strongest pull on the yield.",
        preText: "Burn past Pyre at the Forge and you'll ascend here, to the Immolated: the highest rank of all, with the strongest pull on the yield.",
      },
    ],
  },
  // 5. Where you track everything you've built.
  vault: {
    outside: {
      text: "Everything you build, I keep safe in one place for you. This way, to your Amber Vault.",
      preText: "Everything you build, I keep safe in one place for you. This way, to your Amber Vault.",
    },
    inside: [
      {
        text: "Your Acolyte, your balances, your yield: it all lives here, with quick ways back to the action.",
        preText: "Your Acolyte, your balances and your yield will all live here, with quick ways back to the action.",
      },
    ],
  },
  // 6. Trading the Acolytes others forged (flows from just discussing Acolytes).
  market: {
    outside: {
      text: "Acolytes can change hands, too. Step over here with me, to the Black Market.",
      preText: "Acolytes can change hands, too. Step over here with me, to the Black Market.",
    },
    inside: [
      {
        text: "Browse and buy the Acolytes other people have forged, or sell your own.",
        preText: "You'll browse and buy the Acolytes other people have forged, or sell your own.",
      },
    ],
  },
  // 7. The wide view, a calm beat before the call to action.
  observatory: {
    outside: {
      text: "Before we finish, climb up here with me for the whole view: the Observatory.",
      preText: "Before we finish, climb up here with me for the whole view: the Observatory.",
    },
    inside: [
      {
        text: "From here you read the entire protocol at a glance: supply, decay, burns and yield. No wallet needed to look.",
        preText: "You'll read the entire protocol here at a glance: supply, decay, burns and yield. No wallet needed to look.",
      },
    ],
  },
  // 8. The finale and the one live door today.
  tavern: {
    outside: {
      text: "And last, the place that matters most today: the Ashen Cup. Let's step in.",
      preText: "And last, the place that matters most right now: the Ashen Cup. When the tour ends, this is where you begin. Let's step in.",
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
