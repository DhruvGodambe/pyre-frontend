"use client";

/* THE EMBER CODEX, illustrated plates.

   Each diagram is an illuminated manuscript plate painted by Nano Banana
   (public/world/codex/plate-*.webp) with ALL lettering baked into the
   artwork itself, so every label fits its banner by construction. If a
   label or number ever changes, re-run the bake edit on the plate art;
   do not overlay HTML text onto the painted banners (tried, always looks
   misaligned).

   Overlaid on top: only the numbered key medallions (positions are
   percentages measured against a 2% grid over the artwork) and, on the
   decay plate, the real SVG curve for accurate geometry. The key beneath
   each plate carries the exact parameters on every screen size.

   Plates never surface the yield source; $ETH yield is drawn as a
   destination only. */

import type { ReactNode } from "react";
import type { CodexDiagramId } from "@/lib/codex/content";
import { asset } from "@/lib/config";

/* Ink on parchment, matching the body text in codex-book.tsx. */
const INK = "#2e2113";
const INK_HEAD = "#5d2609";
const INK_SOFT = "#6b5233";
const INK_ACCENT = "#9c4a12";
const GOLD_DEEP = "#8a5a1c";

/* ---------------------------------------------------------------- chrome */

function Plate({
  src,
  alt,
  caption,
  children,
  keyItems,
}: {
  src: string;
  alt: string;
  caption: string;
  children?: ReactNode;
  keyItems?: { n: number; name: string; detail: string }[];
}) {
  return (
    <figure className="my-1">
      <div
        className="relative w-full select-none rounded-[3px] shadow-[0_2px_12px_rgba(60,30,5,0.28)]"
        style={{ containerType: "inline-size" }}
      >
        <img src={asset(src)} alt={alt} draggable={false} className="w-full h-auto rounded-[3px]" />
        {children}
      </div>
      {keyItems && (
        <ol className="mt-3 sm:columns-2 sm:gap-8">
          {keyItems.map((k) => (
            <li key={k.n} className="mb-2 flex gap-2 break-inside-avoid text-[13px] leading-snug">
              <Medallion n={k.n} inline />
              <span style={{ color: INK }}>
                <span className="font-display" style={{ color: INK_HEAD }}>
                  {k.name}.
                </span>{" "}
                {k.detail}
              </span>
            </li>
          ))}
        </ol>
      )}
      <figcaption
        className="mt-2 text-center text-xs italic leading-relaxed"
        style={{ color: INK_SOFT }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

/** Numbered medallion, on the plate (absolute, % anchored) or in the key. */
function Medallion({ n, x, y, inline }: { n: number; x?: number; y?: number; inline?: boolean }) {
  const style: React.CSSProperties = {
    background: "rgba(240,226,198,0.92)",
    border: `1px solid ${GOLD_DEEP}`,
    color: INK_ACCENT,
    boxShadow: "0 1px 2px rgba(60,30,5,0.35)",
  };
  if (inline) {
    return (
      <span
        className="mt-px grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full font-display text-[10.5px]"
        style={style}
        aria-hidden
      >
        {n}
      </span>
    );
  }
  return (
    <span
      className="absolute grid place-items-center rounded-full font-display"
      style={{
        ...style,
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        width: "max(15px, 2.3cqw)",
        height: "max(15px, 2.3cqw)",
        fontSize: "max(9px, 1.35cqw)",
      }}
      aria-hidden
    >
      {n}
    </span>
  );
}

/* ------------------------------------------------------- Plate I: the map */

const GREAT_MAP_KEY = [
  {
    n: 1,
    name: "The Exchange",
    detail:
      "Swap in through the canonical $PYRE/$ETH pool. Tokens arrive liquid, and decay applies from the first epoch.",
  },
  {
    n: 2,
    name: "Liquid $PYRE",
    detail:
      "Decays 0.45% per epoch (one hour), halving every 2,000 epochs toward a 0.01% floor. Every decayed token is burned.",
  },
  {
    n: 3,
    name: "Staked $PYRE",
    detail:
      "Exempt from decay; accrues $ETH pro rata by effective weight. Unstaking is a 7 day linear release, and the returning portion earns no yield.",
  },
  {
    n: 4,
    name: "The Burn",
    detail: "Permanently removes supply and credits the wallet's cumulative burn weight.",
  },
  {
    n: 5,
    name: "Token track",
    detail: "Burns $PYRE alone. Acolyte multipliers run 1× to 3×.",
  },
  {
    n: 6,
    name: "LP track",
    detail:
      "Pairs $PYRE with $ETH and locks the position forever; the liquidity stays live in the pool. Multipliers run 2× to 6×.",
  },
  {
    n: 7,
    name: "The Acolyte",
    detail:
      "Tiers by cumulative burn: Ember 10,000, Flame 75,000, Forge 150,000, Pyre 300,000. The crown is the Immolated: a further ×1.2, for a 7.2× ceiling.",
  },
  {
    n: 8,
    name: "Claim",
    detail: "Accrued $ETH can be claimed at any time; claiming never touches staked principal.",
  },
  {
    n: 9,
    name: "The Bonfire",
    detail:
      "Every chosen burn and every epoch of decay ends here. Hard cap 1,000,000,000; supply only falls.",
  },
];

function GreatMapPlate() {
  return (
    <Plate
      src="/world/codex/plate-great-map.webp"
      alt="The Great Map: every state a $PYRE balance can occupy. Swapping in arrives liquid; liquid balances decay toward the Bonfire; staking earns $ETH; burning on either track forges an Acolyte that multiplies the stake; accrued $ETH is claimable at any time."
      caption="Plate I. The Great Map: every state a $PYRE balance can occupy, and every path between them."
      keyItems={GREAT_MAP_KEY}
    >
      {/* All lettering is painted into the artwork itself (Nano Banana bake).
          Only the key medallions are overlaid, re-measured on the baked art. */}
      <Medallion n={1} x={4.8} y={33} />
      <Medallion n={2} x={23.3} y={35} />
      <Medallion n={3} x={40.8} y={8.5} />
      <Medallion n={4} x={39.5} y={43} />
      <Medallion n={5} x={57} y={39.5} />
      <Medallion n={6} x={55.8} y={58.5} />
      <Medallion n={7} x={74.5} y={59.5} />
      <Medallion n={8} x={84.5} y={60.5} />
      <Medallion n={9} x={33.8} y={74.5} />
    </Plate>
  );
}

/* -------------------------------------------- Plate III: the tier ladder */

const TIER_KEY = [
  {
    n: 1,
    name: "Ember Acolyte",
    detail: "10,000 $PYRE cumulative burn. 1× yield multiplier; 2× on the LP track.",
  },
  {
    n: 2,
    name: "Flame Acolyte",
    detail: "75,000 $PYRE cumulative burn. 1.5×; 3× on the LP track.",
  },
  {
    n: 3,
    name: "Forge Acolyte",
    detail: "150,000 $PYRE cumulative burn. 2×; 4× on the LP track.",
  },
  {
    n: 4,
    name: "Pyre Acolyte",
    detail:
      "300,000 $PYRE cumulative burn. 3×; 6× on the LP track. The flame-wreathed crown above is the Immolated: a further ×1.2, the 7.2× ceiling.",
  },
];

function TierLadderPlate() {
  return (
    <Plate
      src="/world/codex/plate-tiers.webp"
      alt="The Ascension: the four Acolyte tiers as rising pedestals, Ember, Flame, Forge and Pyre, each flame greater than the last, crowned by the Immolated."
      caption="Plate III. The Ascension: tier resolves from cumulative burn weight and never falls."
      keyItems={TIER_KEY}
    >
      <Medallion n={1} x={7.5} y={45.5} />
      <Medallion n={2} x={28.5} y={36} />
      <Medallion n={3} x={50} y={28} />
      <Medallion n={4} x={72} y={20} />
    </Plate>
  );
}

/* -------------------------------------------- Plate IV: the two burn tracks */

const TRACKS_KEY = [
  {
    n: 1,
    name: "The token burn",
    detail:
      "Burns $PYRE alone. The supply reduction is complete at the moment of the burn. Acolyte multipliers 1× to 3×.",
  },
  {
    n: 2,
    name: "The LP burn",
    detail:
      "Pairs $PYRE with $ETH into the canonical pool and locks the position forever. Principal is beyond reach, but the liquidity stays live in the pool and never stops generating yield for the protocol. Multipliers 2× to 6×.",
  },
];

function BurnTracksPlate() {
  return (
    <Plate
      src="/world/codex/plate-tracks.webp"
      alt="The Two Sacrifices: on the left a token burn, coins consumed to cold ash, complete; on the right an LP burn, coins and $ETH sealed under lock in a glowing pool that keeps working forever."
      caption="Plate IV. The Two Sacrifices: a token burn ends in ash; an LP burn is locked, not dead."
      keyItems={TRACKS_KEY}
    >
      <Medallion n={1} x={10.5} y={11} />
      <Medallion n={2} x={58} y={40} />
    </Plate>
  );
}

/* ---------------------------------------------- Plate V: the Ascend rite */

const RITE_KEY = [
  {
    n: 1,
    name: "The price",
    detail:
      "Eligibility is the Pyre tier, 300,000 $PYRE of cumulative burn. The rite burns a further 100,000 $PYRE through the ImmolatedGate; a wallet on the LP track pairs the equivalent $ETH as well, locked permanently.",
  },
  {
    n: 2,
    name: "The grant",
    detail:
      "A permanent ×1.2 on staking yield, stacking multiplicatively with tier and track: the protocol's 7.2× ceiling.",
  },
];

function AscendRitePlate() {
  return (
    <Plate
      src="/world/codex/plate-ascend.webp"
      alt="The Ascend Rite: a Pyre Acolyte pours 100,000 $PYRE into the great flame and emerges transfigured as the Immolated."
      caption="Plate V. The Ascend Rite: one wallet, once, forever."
      keyItems={RITE_KEY}
    >
      <Medallion n={1} x={20.5} y={25.5} />
      <Medallion n={2} x={62} y={20.5} />
    </Plate>
  );
}

/* ------------------------------------------------- Plate: the decay curve */

/* Idle decay rate over time: 0.45%/epoch at start, halving every 2,000 epochs
   toward a 0.01%/epoch floor. The curve stays real SVG (accurate geometry),
   inked in the parchment palette. */
function DecayCurveDiagram() {
  return (
    <figure className="my-1">
      <div
        className="relative w-full select-none rounded-[3px] shadow-[0_2px_12px_rgba(60,30,5,0.28)]"
        style={{ containerType: "inline-size" }}
      >
        <img
          src={asset("/world/codex/plate-decay.webp")}
          alt=""
          draggable={false}
          aria-hidden
          className="w-full h-auto rounded-[3px]"
        />
        <svg
          viewBox="0 0 680 412"
          className="absolute left-[6%] top-[7%] w-[88%] h-[76%]"
          preserveAspectRatio="none"
          role="img"
          aria-label="Decay rate over epochs: starts near 0.45 percent per epoch and halves every 2,000 epochs toward a 0.01 percent floor. Staked $PYRE does not decay."
        >
          {/* Axes */}
          <line x1="72" y1="36" x2="72" y2="352" stroke={INK_SOFT} strokeWidth="1.5" />
          <line x1="72" y1="352" x2="648" y2="352" stroke={INK_SOFT} strokeWidth="1.5" />

          {/* Area under the decay curve (ember tint) */}
          <path
            d="M72,80 Q144,150 216,210 Q288,255 360,285 Q432,305 504,318 Q576,326 648,331 L648,352 L72,352 Z"
            fill={INK_ACCENT}
            fillOpacity="0.10"
          />
          {/* The decay curve, an ember returning to the fire */}
          <path
            d="M72,80 Q144,150 216,210 Q288,255 360,285 Q432,305 504,318 Q576,326 648,331"
            fill="none"
            stroke={INK_ACCENT}
            strokeWidth="2.5"
          />

          {/* Floor line */}
          <line x1="72" y1="336" x2="648" y2="336" stroke={INK_SOFT} strokeWidth="1" strokeDasharray="4 4" />
          <text x="80" y="331" fill={INK_SOFT} fontSize="10">0.01%/epoch floor</text>

          {/* Start point + rate label */}
          <circle cx="72" cy="80" r="3.5" fill={INK_HEAD} />
          <text x="84" y="74" className="font-display" fill={INK_HEAD} fontSize="14">0.45%/epoch</text>

          {/* Halving annotation */}
          <text x="280" y="160" fill={INK} fontSize="11" fontStyle="italic">halves every 2,000 epochs (~83 days)</text>

          {/* Staked baseline callout */}
          <text x="80" y="372" fill={INK_ACCENT} fontSize="11">staked $PYRE: 0%, no decay</text>

          {/* Axis labels */}
          <text x="30" y="195" transform="rotate(-90 30 195)" textAnchor="middle" fill={INK_SOFT} fontSize="11">decay rate / epoch</text>
          <text x="360" y="396" textAnchor="middle" fill={INK_SOFT} fontSize="11">time (epochs) →</text>
        </svg>
      </div>
      <figcaption className="mt-2 text-center text-xs italic leading-relaxed" style={{ color: INK_SOFT }}>
        Plate II. The Long Cooling: idle $PYRE decays at 0.45% per epoch (one epoch is one hour), halving
        every 2,000 epochs toward a 0.01% floor. Staking stops it entirely.
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- export */

export function CodexDiagram({ id }: { id: CodexDiagramId }) {
  if (id === "great-map") return <GreatMapPlate />;
  if (id === "decay-curve") return <DecayCurveDiagram />;
  if (id === "tier-ladder") return <TierLadderPlate />;
  if (id === "burn-tracks") return <BurnTracksPlate />;
  if (id === "ascend-rite") return <AscendRitePlate />;
  return null;
}
