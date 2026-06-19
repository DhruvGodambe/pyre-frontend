/* Placeholder for the Pyre Acolyte's on-chain SVG. When the NFT contract ships,
   `svg` (from tokenURI) renders here instead of the placeholder. Stage colour,
   LP gradient and Immolated sigil markers are shown so the variants are visible
   in the skeleton. */

import type { Acolyte } from "@/lib/types";
import { Badge } from "./primitives";

const STAGE_COLOR: Record<number, string> = {
  1: "var(--color-stage-ember)",
  2: "var(--color-stage-flame)",
  3: "var(--color-stage-forge)",
  4: "var(--color-stage-pyre)",
};

export function AcolyteArt({
  acolyte,
  size = 200,
}: {
  acolyte: Acolyte;
  size?: number;
}) {
  if (acolyte.svg) {
    // Real on-chain SVG markup.
    return (
      <div
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: acolyte.svg }}
      />
    );
  }
  return (
    <div
      className="relative rounded-lg overflow-hidden border border-surface-3 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 60%, ${STAGE_COLOR[acolyte.stage]}55, var(--color-surface) 70%)`,
      }}
    >
      <span className="text-6xl" aria-hidden>
        🔥
      </span>
      {acolyte.isLP && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, transparent, var(--color-brand-soft)22)" }}
        />
      )}
      <div className="absolute bottom-2 left-2 flex gap-1">
        {acolyte.isLP && <Badge tone="brand">LP</Badge>}
        {acolyte.isImmolated && <Badge tone="danger">Immolated</Badge>}
      </div>
      <span className="absolute top-2 right-2 text-text-3 text-[10px] tabular">
        #{acolyte.tokenId}
      </span>
    </div>
  );
}
