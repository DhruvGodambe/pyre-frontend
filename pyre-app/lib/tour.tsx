"use client";

/* ============================================================================
   PYRE, Guided world tour  (the real, interactive onboarding)
   ----------------------------------------------------------------------------
   Replaces the old click-through card deck. The Emberkeeper walks a first-time
   visitor through the ACTUAL kingdom: the camera pans/zooms to each building
   (outside beat), then steps INSIDE it (inside beat) with a line on what you do
   there, ending in the Ashen Cup, where the first rite happens in place.

   This is a shared state machine. Both shells read it and drive the world their
   own way: the VillageShell moves the camera + opens interiors; the MobileShell
   (later) scrolls + opens the stacked panels. The narration is identical.

   The tour runs in the AWAKE kingdom (identity already chosen at the Gate / in
   the intro), so the interiors render real content instead of a connect wall.
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BuildingId } from "@/components/buildings";
import { usePreview } from "@/lib/preview";
import { useNavigation } from "@/lib/navigation";
import { preloadAudio } from "@/lib/audio-preload";

export type TourPhase = "outside" | "inside";

/* The walk, ordered to follow the real user journey and to flow building to
   building (each stop hands off to the next): the heart of the fire, then how you
   get $PYRE, then what you do with it, its pinnacle, where you track it, trading,
   the wide view, and finally the one live door, the Ashen Cup. The Gate is
   excluded, it's the entry, already used to wake the kingdom. */
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

/* The Emberkeeper's recorded clips (ek_v1..ek_v20) follow the walk order
   exactly: v1 = the overview line, then outside → inside(s) per building
   down the ORDER list. */
const LINES: Record<BuildingId, { outside: TourLine; inside: TourInsideStep[] }> = {
  // 1. The heart of the fire, the theme of the whole place.
  bonfire: {
    outside: {
      text: "Let's begin at the heart of it all: the Bonfire, burning at the center of the kingdom. Every $PYRE anyone sends to the fire shows up here.",
      preText: "Let's begin at the heart of it all: the Bonfire, burning at the center of the kingdom. Every $PYRE anyone sends to the fire will show up here, live.",
      voice: "/world/voice/ek_v2.mp3",
    },
    inside: [
      {
        text: "This is the total $PYRE burned across everyone, climbing in real time. The whole kingdom turns around this fire.",
        preText: "This will be the total $PYRE burned across everyone, climbing in real time once the fire is lit. The whole kingdom turns around this fire.",
        voice: "/world/voice/ek_v3.mp3",
      },
    ],
  },
  // 2. The on-ramp: first you need $PYRE.
  exchange: {
    outside: {
      text: "Before you can take part, you'll need some $PYRE of your own. Here's where you get it: the Grand Exchange.",
      preText: "Before you can take part, you'll need some $PYRE of your own. Here's where you get it: the Grand Exchange.",
      voice: "/world/voice/ek_v4.mp3",
    },
    inside: [
      {
        text: "Swap your $ETH for $PYRE right here, with every fee shown upfront. This is your way in.",
        preText: "You'll swap your $ETH for $PYRE right here, with every fee shown upfront. This is your way in.",
        voice: "/world/voice/ek_v5.mp3",
      },
    ],
  },
  // 3. The core loop: stake to earn, burn to rise. Ends by handing off to the Hall.
  forge: {
    outside: {
      text: "Now, with $PYRE in hand, this is where the real work happens: the Forge.",
      preText: "Now, with $PYRE in hand, this is the Forge, where the real work will happen.",
      voice: "/world/voice/ek_v6.mp3",
    },
    inside: [
      {
        text: "First, stake your $PYRE here. That stops it decaying and starts earning you $ETH yield.",
        preText: "First, you'll stake your $PYRE here. That stops it decaying and starts earning you $ETH yield.",
        voice: "/world/voice/ek_v7.mp3",
      },
      {
        text: "Then comes the burn, and here you choose your path. The first is the Burn path, the direct one: burn $PYRE on its own to forge your Acolyte NFT, which multiplies your staked yield up to 3×. You always burn from your unstaked $PYRE, and the multiplier only pays while you keep $PYRE staked, so keep some staked and burn the rest to climb.",
        preText: "Then comes the burn, and here you'll choose your path. The first is the Burn path, the direct one: burn $PYRE on its own to forge your Acolyte NFT, which multiplies your staked yield up to 3×. You always burn from your unstaked $PYRE, and the multiplier only pays while you keep $PYRE staked, so keep some staked and burn the rest to climb.",
        voice: "/world/voice/ek_v8.mp3",
      },
      {
        text: "Whichever path you take, your Acolyte climbs the same four tiers as you burn more: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×), the top tier. There is one honor beyond the tiers, the Immolated, but that is a prestige earned in the Hall, not here at the Forge. I'll show you.",
        preText: "Whichever path you take, your Acolyte will climb the same four tiers as you burn more: Ember Acolyte at 10K burned (1×), Flame Acolyte at 75K (1.5×), Forge Acolyte at 150K (2×), and Pyre Acolyte at 300K (3×), the top tier. There is one honor beyond the tiers, the Immolated, but that is a prestige earned in the Hall, not here at the Forge. I'll show you.",
        voice: "/world/voice/ek_v9.mp3",
      },
      {
        text: "The other path is the LP Burn, a deeper commitment. Instead of $PYRE alone, you pair it with $ETH and lock both in the pool forever, with no taking either back. It forges the exclusive LP Acolyte, rarer and visibly set apart, and it earns 2× the $ETH yield of a plain-burn Acolyte of the same tier. Both paths climb the very same four tiers to Pyre, and each can be crowned with the Immolated prestige in the Hall, so an LP Immolated is the highest form of all. Come, let me take you there.",
        preText: "The other path is the LP Burn, a deeper commitment. Instead of $PYRE alone, you'll pair it with $ETH and lock both in the pool forever, with no taking either back. It forges the exclusive LP Acolyte, rarer and visibly set apart, and it earns 2× the $ETH yield of a plain-burn Acolyte of the same tier. Both paths climb the very same four tiers to Pyre, and each can be crowned with the Immolated prestige in the Hall, so an LP Immolated is the highest form of all. Come, let me take you there.",
        voice: "/world/voice/ek_v10.mp3",
      },
    ],
  },
  // 4. The prestige, earned by the Ascend rite in the Hall (not a Forge tier).
  immolated: {
    outside: {
      text: "Here it is: the Hall of the Immolated, home to the rarest Acolytes in the kingdom.",
      preText: "Here it is: the Hall of the Immolated, home to the rarest Acolytes in the kingdom.",
      voice: "/world/voice/ek_v11.mp3",
    },
    inside: [
      {
        text: "The Immolated is no tier, it is the highest prestige in the kingdom, and it is earned here. You take the Ascend rite in this Hall and burn 100K $PYRE, or 100K $PYRE with the equivalent in $ETH if you walk the LP path, becoming Immolate or LP Immolate to match. It adds a permanent +20% to your yield on top of your tier, the strongest pull on the fire.",
        preText: "The Immolated is no tier, it is the highest prestige in the kingdom, and it is earned here. You'll take the Ascend rite in this Hall and burn 100K $PYRE, or 100K $PYRE with the equivalent in $ETH if you walk the LP path, becoming Immolate or LP Immolate to match. It will add a permanent +20% to your yield on top of your tier, the strongest pull on the fire.",
        voice: "/world/voice/ek_v12.mp3",
      },
    ],
  },
  // 5. Where you track everything you've built.
  vault: {
    outside: {
      text: "Everything you build, I keep safe for you in one place: your Amber Vault.",
      preText: "Everything you build, I keep safe for you in one place: your Amber Vault.",
      voice: "/world/voice/ek_v13.mp3",
    },
    inside: [
      {
        text: "Your Acolyte, your balances, your yield: it all lives here, with quick ways back to the action.",
        preText: "Your Acolyte, your balances and your yield will all live here, with quick ways back to the action.",
        voice: "/world/voice/ek_v14.mp3",
      },
    ],
  },
  // 6. Trading the Acolytes others forged (flows from just discussing Acolytes).
  market: {
    outside: {
      text: "Acolytes can change hands, too. This is the Black Market.",
      preText: "Acolytes can change hands, too. This is the Black Market.",
      voice: "/world/voice/ek_v15.mp3",
    },
    inside: [
      {
        text: "Browse and buy the Acolytes other people have forged, or sell your own.",
        preText: "You'll browse and buy the Acolytes other people have forged, or sell your own.",
        voice: "/world/voice/ek_v16.mp3",
      },
    ],
  },
  // 7. The wide view, a calm beat before the call to action.
  observatory: {
    outside: {
      text: "Before we finish, the whole view from a single place: the Observatory.",
      preText: "Before we finish, the whole view from a single place: the Observatory.",
      voice: "/world/voice/ek_v17.mp3",
    },
    inside: [
      {
        text: "From here you read the entire protocol at a glance: supply, decay, burns and yield. No wallet needed to look.",
        preText: "You'll read the entire protocol here at a glance: supply, decay, burns and yield. No wallet needed to look.",
        voice: "/world/voice/ek_v18.mp3",
      },
    ],
  },
  // 8. The finale and the one live door today.
  tavern: {
    outside: {
      text: "And last, the place that matters most today: the Ashen Cup.",
      preText: "And last, the place that matters most right now: the Ashen Cup. When the tour ends, this is where you begin.",
      voice: "/world/voice/ek_v19.mp3",
    },
    inside: [
      {
        text: "Here are the quests. Complete them to earn Points and climb the leaderboard. Let's do your first.",
        preText: "Here are the quests, open right now. Complete them to earn Points and climb the leaderboard before the gates open. Let's do your first.",
        voice: "/world/voice/ek_v20.mp3",
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
  text: "Welcome to Pyre. I'm the Emberkeeper: I tend the flame at the heart of this kingdom and guide every newcomer through it. The idea here is simple: stake $PYRE to earn $ETH yield, then burn it to forge an Acolyte NFT that multiplies what you earn. And your Acolyte grows through tiers: every tier it climbs raises your multiplier and reveals more traits. Come, let me show you around, building by building.",
  preText: "Welcome to Pyre. I'm the Emberkeeper: I tend the flame at the heart of this kingdom and guide every newcomer through it. The idea here is simple: stake $PYRE to earn $ETH yield, then burn it to forge an Acolyte NFT that multiplies what you earn. And your Acolyte grows through tiers: every tier it climbs raises your multiplier and reveals more traits. Let me show you what's coming, and how to earn Points toward a reward before the gates open.",
  voice: "/world/voice/ek_v1.mp3",
};

/* Build the whole walk for the current launch phase. Pre-launch beats speak in
   future tense (sealed previews); launched beats walk you through doing it. */
function buildBeats(launched: boolean): TourBeat[] {
  return [
    {
      phase: "outside",
      overview: true,
      text: say(OVERVIEW_LINE, launched),
      voice: OVERVIEW_LINE.voice,
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

  // Once the tour starts, warm every narration clip in the background so each
  // beat's voice is cache-hot and plays the moment it's reached, instead of the
  // per-beat fetch that can trip the 2s watchdog into the silent typewriter.
  useEffect(() => {
    if (active) preloadAudio(beats.map((b) => b.voice).filter((v): v is string => !!v));
  }, [active, beats]);

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
