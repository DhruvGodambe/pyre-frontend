"use client";

/* THE EMBER CODEX, functional diagrams.

   On-brand SVG (no building art): a yield-flow diagram for the overview and a
   decay curve for The Bonfire. Styled to the fire aesthetic, warm ember/gold/
   stone on near-black, the Cormorant display serif for node names, and an ember
   glow on the $ETH node, so they read as codex illustrations, not a corporate
   flowchart. Colours are Tailwind fill/stroke utilities mapped to the --color-*
   tokens in globals.css. Diagrams never surface the yield source we keep subtle. */

import type { CodexDiagramId } from "@/lib/codex/content";

const EMBER_BG = {
  backgroundImage:
    "radial-gradient(120% 100% at 50% 0%, rgba(240,169,59,0.10), transparent 62%)",
};

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure
      className="relative overflow-hidden rounded-panel border border-brand/25 bg-surface/60 p-3 sm:p-4"
      style={EMBER_BG}
    >
      {children}
      <figcaption className="mt-2 text-center text-text-3 text-xs italic leading-relaxed">
        {label}
      </figcaption>
    </figure>
  );
}

/* Stake -> earn $ETH; burn -> Acolyte (1x-3x) -> multiplies the same $ETH.
   Burning alone earns nothing: both burn and stake arrows converge on yield. */
function YieldFlowDiagram() {
  return (
    <Figure label="Stake to earn $ETH. Burn to forge an Acolyte that multiplies it. Burning alone earns nothing.">
      <svg
        viewBox="0 0 680 268"
        className="w-full h-auto"
        role="img"
        aria-label="How yield flows in Pyre: staking $PYRE earns $ETH, and burning $PYRE forges an Acolyte that multiplies that $ETH yield."
      >
        <defs>
          <marker id="yf-gold" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-brand" />
          </marker>
          <marker id="yf-ember" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-brand-deep" />
          </marker>
          <filter id="yf-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f0a93b" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* $PYRE, the shared start */}
        <rect x="24" y="102" width="112" height="64" rx="12" className="fill-surface-2 stroke-brand/45" strokeWidth="1.5" />
        <text x="80" y="131" textAnchor="middle" className="font-display fill-brand" fontSize="20">$PYRE</text>
        <text x="80" y="149" textAnchor="middle" className="fill-text-3" fontSize="11">your tokens</text>

        {/* Stake path */}
        <path d="M136,122 C192,122 198,70 244,70" fill="none" className="stroke-brand/70" strokeWidth="1.75" markerEnd="url(#yf-gold)" />
        <text x="192" y="88" textAnchor="middle" className="fill-brand-soft" fontSize="11" fontStyle="italic">stake</text>
        <rect x="246" y="42" width="156" height="58" rx="12" className="fill-surface-2 stroke-brand/70" strokeWidth="1.5" />
        <text x="324" y="67" textAnchor="middle" className="font-display fill-text" fontSize="16">Staked $PYRE</text>
        <text x="324" y="85" textAnchor="middle" className="fill-text-3" fontSize="11">does not decay</text>
        <path d="M402,70 C448,70 470,108 500,122" fill="none" className="stroke-brand/70" strokeWidth="1.75" markerEnd="url(#yf-gold)" />
        <text x="452" y="92" textAnchor="middle" className="fill-text-2" fontSize="11" fontStyle="italic">earns</text>

        {/* Burn path (two tracks: plain burn 1x-3x, and LP burn at 2x the yield) */}
        <path d="M136,146 C192,146 198,199 244,199" fill="none" className="stroke-brand-deep/70" strokeWidth="1.75" markerEnd="url(#yf-ember)" />
        <text x="192" y="190" textAnchor="middle" className="fill-stage-flame" fontSize="11" fontStyle="italic">burn</text>
        <rect x="246" y="162" width="156" height="74" rx="12" className="fill-surface-2 stroke-brand-deep/80" strokeWidth="1.5" />
        <text x="324" y="187" textAnchor="middle" className="font-display fill-text" fontSize="16">Acolyte NFT</text>
        <text x="324" y="205" textAnchor="middle" className="fill-text-3" fontSize="11">$PYRE burn: tier 1x → 3x</text>
        <text x="324" y="221" textAnchor="middle" className="fill-text-3" fontSize="11">LP burn: tier 2x → 6x</text>
        <path d="M402,199 C448,199 470,160 500,146" fill="none" className="stroke-brand-deep/70" strokeWidth="1.75" markerEnd="url(#yf-ember)" />
        <text x="452" y="190" textAnchor="middle" className="fill-text-2" fontSize="11" fontStyle="italic">multiplies</text>

        {/* $ETH yield, where both paths converge, lit like an ember */}
        <rect x="500" y="98" width="156" height="72" rx="12" className="fill-brand stroke-brand" fillOpacity="0.14" strokeWidth="2" filter="url(#yf-glow)" />
        <text x="578" y="131" textAnchor="middle" className="font-display fill-brand" fontSize="19">$ETH yield</text>
        <text x="578" y="150" textAnchor="middle" className="fill-text-2" fontSize="11">paid to stakers</text>
      </svg>
    </Figure>
  );
}

/* Idle decay rate over time: 0.45%/epoch at start, halving every 2,000 epochs
   toward a 0.01%/epoch floor. Staking removes it entirely (the 0 baseline). */
function DecayCurveDiagram() {
  return (
    <Figure label="Idle $PYRE decays at about 0.45% per epoch (one epoch is one hour), halving every 2,000 epochs toward a 0.01% floor. Staking stops it entirely.">
      <svg
        viewBox="0 0 680 300"
        className="w-full h-auto"
        role="img"
        aria-label="Decay rate over epochs: starts near 0.45 percent per epoch and halves every 2,000 epochs toward a 0.01 percent floor. Staked $PYRE does not decay."
      >
        <defs>
          <filter id="dc-glow" x="-20%" y="-40%" width="140%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c8731c" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Axes */}
        <line x1="72" y1="40" x2="72" y2="244" className="stroke-surface-3" strokeWidth="1.5" />
        <line x1="72" y1="244" x2="648" y2="244" className="stroke-surface-3" strokeWidth="1.5" />

        {/* Area under the decay curve (ember tint) */}
        <path
          d="M72,60 Q144,110 216,152 Q288,182 360,198 Q432,210 504,221 Q576,228 648,232 L648,244 L72,244 Z"
          className="fill-brand-deep"
          fillOpacity="0.10"
        />
        {/* The decay curve, an ember returning to the fire */}
        <path
          d="M72,60 Q144,110 216,152 Q288,182 360,198 Q432,210 504,221 Q576,228 648,232"
          fill="none"
          className="stroke-brand-deep"
          strokeWidth="2.5"
          filter="url(#dc-glow)"
        />

        {/* Floor line */}
        <line x1="72" y1="240" x2="648" y2="240" className="stroke-text-3" strokeWidth="1" strokeDasharray="4 4" />
        <text x="646" y="235" textAnchor="end" className="fill-text-3" fontSize="10">0.01%/epoch floor</text>

        {/* Start point + rate label */}
        <circle cx="72" cy="60" r="3.5" className="fill-brand" />
        <text x="84" y="54" className="font-display fill-brand" fontSize="14">0.45%/epoch</text>

        {/* Halving annotation */}
        <text x="300" y="120" className="fill-text-2" fontSize="11" fontStyle="italic">halves every 2,000 epochs (~83 days)</text>

        {/* Staked baseline callout */}
        <text x="80" y="260" className="fill-brand-soft" fontSize="11">staked $PYRE: 0%, no decay</text>

        {/* Axis labels */}
        <text x="26" y="145" transform="rotate(-90 26 145)" textAnchor="middle" className="fill-text-3" fontSize="11">decay rate / epoch</text>
        <text x="360" y="288" textAnchor="middle" className="fill-text-3" fontSize="11">time (epochs) →</text>
      </svg>
    </Figure>
  );
}

export function CodexDiagram({ id }: { id: CodexDiagramId }) {
  if (id === "yield-flow") return <YieldFlowDiagram />;
  if (id === "decay-curve") return <DecayCurveDiagram />;
  return null;
}
