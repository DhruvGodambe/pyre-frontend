/* The Pyre Acolyte's art. The real per-token render isn't delivered yet, so we
   show the shared hooded-Acolyte piece (public/world/acolytes/acolyte.png) and
   convey the TIER with a glow that intensifies as you climb Ember → Pyre. When
   the on-chain SVG (or per-tier art) ships, swap the source; the glow stays. */

import Image from "next/image";
import type { Acolyte } from "@/lib/types";
import { asset } from "@/lib/config";
import { Badge } from "./primitives";

const ACOLYTE_IMG = "/world/acolytes/acolyte.png";

const STAGE_COLOR: Record<number, string> = {
  1: "var(--color-stage-ember)",
  2: "var(--color-stage-flame)",
  3: "var(--color-stage-forge)",
  4: "var(--color-stage-pyre)",
};

/* Tier as light: the higher the stage, the larger and brighter the ember glow
   around (and within) the art. Immolated adds a danger-red ring on top. `k`
   scales the whole effect to the art size so it reads at 36px and 200px alike. */
function tierGlow(stage: number, isImmolated: boolean, k = 1): string {
  const c = STAGE_COLOR[stage] ?? STAGE_COLOR[1];
  const blur = (8 + stage * 11) * k;
  const spread = stage * 2 * k;
  const alpha = 22 + stage * 13; // 35 → 74%
  const outer = `0 0 ${blur}px ${spread}px color-mix(in srgb, ${c} ${alpha}%, transparent)`;
  if (!isImmolated) return outer;
  return `${outer}, 0 0 0 ${2 * k}px color-mix(in srgb, var(--color-danger) 75%, transparent), 0 0 ${24 * k}px ${5 * k}px color-mix(in srgb, var(--color-danger) 45%, transparent)`;
}

export function AcolyteArt({
  acolyte,
  size = 200,
}: {
  acolyte: Acolyte;
  size?: number;
}) {
  const k = size / 200;
  if (acolyte.svg) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ width: size, height: size, boxShadow: tierGlow(acolyte.stage, acolyte.isImmolated, k) }}
        dangerouslySetInnerHTML={{ __html: acolyte.svg }}
      />
    );
  }
  return (
    <div
      className="relative rounded-lg overflow-hidden border border-surface-3"
      style={{ width: size, height: size, boxShadow: tierGlow(acolyte.stage, acolyte.isImmolated, k) }}
    >
      <Image
        src={asset(ACOLYTE_IMG)}
        alt={`Acolyte #${acolyte.tokenId}`}
        width={size}
        height={size}
        className="h-full w-full object-cover select-none"
        draggable={false}
      />
      {/* Inner ember glow, also tier-scaled, so the fire reads as coming from
          the Acolyte rather than just a ring behind it. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 ${(16 + acolyte.stage * 10) * k}px color-mix(in srgb, ${
            STAGE_COLOR[acolyte.stage] ?? STAGE_COLOR[1]
          } ${12 + acolyte.stage * 9}%, transparent)`,
        }}
      />
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
      <span className="absolute top-2 right-2 text-text-3 text-[10px] tabular bg-bg/55 rounded px-1">
        #{acolyte.tokenId}
      </span>
    </div>
  );
}

/* Compact Acolyte thumbnail for the HUD profile header: just the art + the
   tier glow, no badges/tokenId. Immolated keeps its danger ring. */
export function AcolyteAvatar({
  acolyte,
  size = 36,
}: {
  acolyte: Acolyte;
  size?: number;
}) {
  const ring = acolyte.isImmolated ? "border-danger/70" : "border-surface-3";
  const glow = tierGlow(acolyte.stage, acolyte.isImmolated, size / 200);
  if (acolyte.svg) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-lg border ${ring} [&>svg]:h-full [&>svg]:w-full`}
        style={{ width: size, height: size, boxShadow: glow }}
        dangerouslySetInnerHTML={{ __html: acolyte.svg }}
      />
    );
  }
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border ${ring}`}
      style={{ width: size, height: size, boxShadow: glow }}
      aria-hidden
    >
      <Image
        src={asset(ACOLYTE_IMG)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover select-none"
        draggable={false}
      />
    </div>
  );
}
