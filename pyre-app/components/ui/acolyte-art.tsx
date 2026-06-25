/* The Pyre Acolyte's art. The real per-token / per-tier render isn't delivered
   yet, so we show the shared hooded-Acolyte piece
   (public/world/acolytes/acolyte.png) for every tier. Tier is meant to read from
   the ARTWORK ITSELF once per-tier art lands, swap ACOLYTE_IMG for a per-stage
   lookup then. No external glow. */

import Image from "next/image";
import type { Acolyte } from "@/lib/types";
import { asset } from "@/lib/config";
import { Badge } from "./primitives";

const ACOLYTE_IMG = "/world/acolytes/acolyte.png";

export function AcolyteArt({
  acolyte,
  size = 200,
}: {
  acolyte: Acolyte;
  size?: number;
}) {
  if (acolyte.svg) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: acolyte.svg }}
      />
    );
  }
  return (
    <div
      className="relative rounded-lg overflow-hidden border border-surface-3"
      style={{ width: size, height: size }}
    >
      <Image
        src={asset(ACOLYTE_IMG)}
        alt={`Acolyte #${acolyte.tokenId}`}
        width={size}
        height={size}
        className="h-full w-full object-cover select-none"
        draggable={false}
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

/* Compact Acolyte thumbnail for the HUD profile header: just the art, no
   badges/tokenId. Immolated keeps a danger ring border. */
export function AcolyteAvatar({
  acolyte,
  size = 36,
}: {
  acolyte: Acolyte;
  size?: number;
}) {
  const ring = acolyte.isImmolated ? "border-danger/70" : "border-surface-3";
  if (acolyte.svg) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-lg border ${ring} [&>svg]:h-full [&>svg]:w-full`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: acolyte.svg }}
      />
    );
  }
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border ${ring}`}
      style={{ width: size, height: size }}
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
