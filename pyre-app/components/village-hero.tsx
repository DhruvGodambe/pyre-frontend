"use client";

/* A static, non-interactive render of the whole PYRE village: the base map with
   every building composited on top, exactly as the village shell lays them out
   (base-anchored at each building's map x/y, width = scale% of the stage, depth-
   sorted by y). Used as the Codex overview hero, because the base map.webp on its
   own has no buildings, they are separate cutouts layered at runtime.

   MAP_RATIO is redeclared here (not imported from village-shell) on purpose:
   village-shell imports the Codex button, so importing back from it would form a
   cycle. Keep this value in sync with MAP_RATIO there (6688 / 3764). */

import { BUILDINGS } from "@/components/buildings";
import { asset } from "@/lib/config";

const MAP_RATIO = 6688 / 3764; // ≈ 1.777, mirrors village-shell.MAP_RATIO

export function VillageHero() {
  return (
    <figure
      className="mt-5 overflow-hidden rounded-panel border border-surface-3/70 bg-surface/50"
      aria-label="The Pyre kingdom: every building is one part of the protocol."
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: String(MAP_RATIO) }}>
        {/* Map + buildings scaled up and centred on the plaza, so the kingdom
            reads large rather than lost in the wide mountain landscape. */}
        <div
          className="absolute inset-0"
          style={{ transform: "scale(1.5)", transformOrigin: "49.5% 57%" }}
        >
          {/* Base map (its native aspect is MAP_RATIO, so object-cover is exact). */}
          <img
            src={asset("/world/map.webp")}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover"
            draggable={false}
          />
          {/* Buildings, composited exactly as the shell positions them. */}
          {BUILDINGS.map((b) =>
            b.art ? (
              <img
                key={b.id}
                src={asset(b.art)}
                alt={b.name}
                className="absolute select-none"
                draggable={false}
                style={{
                  left: `${b.map.x}%`,
                  top: `${b.map.y}%`,
                  width: `${b.scale}%`,
                  height: "auto",
                  transform: "translate(-50%, -84%)",
                  zIndex: Math.round(b.map.y),
                }}
              />
            ) : null
          )}
        </div>
      </div>
    </figure>
  );
}
