"use client";

/* MOBILE SHELL, the village on a phone. Most users arrive here, so they get the
   SAME world as desktop, not a stripped-down dashboard: the designer's world map,
   fit whole-to-screen (letterboxed top/bottom on the dark theme), every building
   a tappable hotspot. Tapping a building steps inside it as a full-screen sheet
   (the shared InteriorView, reused from the Village shell), so the experience and
   the art match the desktop village. Mobile-first is a hard requirement.

   No camera fly-over (too fiddly on touch): the map simply fits the viewport and
   tapping opens the interior. The guided tour, the entry gate, and the audio all
   work the same as desktop, driven from here. */

import { useEffect, useState } from "react";
import Image from "next/image";
import { BUILDINGS, BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";
import { EntryFork } from "@/components/ui/entry-fork";
import { BuildingAudio } from "@/components/world-audio";
import { useNavigation } from "@/lib/navigation";
import { useIdentity } from "@/lib/identity";
import { useTour } from "@/lib/tour";
import { WorldRiteProgress, WorldProfile } from "@/components/world-hud";
import { TourNarration } from "@/components/tour-ui";
import { ImageButton } from "@/components/ui/image-button";
import { InteriorView, MAP_RATIO, WORLD_THEME } from "@/components/shells/village-shell";
import { asset, USE_MOCK } from "@/lib/config";
import { playDoor } from "@/lib/sfx";

/* Icons for buildings whose art hasn't been delivered (matches the Village shell). */
const PLACEHOLDER_ICON: Partial<Record<BuildingId, string>> = {
  observatory: "🔭",
  tavern: "🍺",
  vault: "🔐",
};

export function MobileShell() {
  const { pending, clearPending } = useNavigation();
  const { isSet } = useIdentity();
  const tour = useTour();
  // The building you've stepped inside (full-screen interior sheet). null = on the map.
  const [inside, setInside] = useState<BuildingId | null>(null);

  // The tour drives navigation while it runs: an "inside" beat opens that
  // building's interior; any other beat (outside / overview) returns to the map.
  useEffect(() => {
    if (!tour.active) return;
    if (tour.beat?.phase === "inside" && tour.beat.building) {
      setInside(tour.beat.building);
    } else {
      setInside(null);
    }
  }, [tour.active, tour.beat]);

  // Honour a deep-link / conversion CTA (e.g. tour finale → Ashen Cup, Vault →
  // "Stake" → Forge): step inside the target. A tab is left on `pending` for the
  // panel to consume; otherwise we clear it here so it can't re-fire stale.
  useEffect(() => {
    if (!pending || pending.building === "gate") return;
    if (pending.building === "") {
      setInside(null);
      clearPending();
      return;
    }
    setInside(pending.building as BuildingId);
    if (!pending.tab) clearPending();
  }, [pending, clearPending]);

  const tapBuilding = (id: BuildingId) => {
    if (tour.active) return; // the tour drives navigation
    if (id === "gate") return; // the Gate is the entry, handled by the gate overlay
    playDoor(id);
    setInside(id);
  };

  // World + building ambiance, same model as desktop: the village theme plays on
  // the map; stepping inside swaps to that building's track. During the tour the
  // world theme stays on as a dimmed ambience bed under the narration / voice-over.
  const buildingSound = inside ? BUILDING_BY_ID[inside].sound ?? null : null;
  const sound = tour.active ? WORLD_THEME : buildingSound ?? (isSet ? WORLD_THEME : null);

  return (
    <main className="min-h-dvh relative overflow-hidden bg-bg">
      {/* Brand + connect + standing, floating over the top letterbox band. */}
      <header className="absolute top-0 inset-x-0 z-20 px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            PYRE
          </span>
          <ConnectButton />
        </div>
        {isSet && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <WorldProfile />
            <WorldRiteProgress />
          </div>
        )}
      </header>

      {/* THE VILLAGE, fit whole-to-screen. The map keeps its own ratio inside a
          centered box (so the entire kingdom is visible); the dark theme fills the
          letterbox bands above/below. Buildings sit on top by %-coordinate, the
          same placement data the desktop map uses. */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative w-full" style={{ aspectRatio: String(MAP_RATIO) }}>
          <Image
            src={asset("/world/map.webp")}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none"
          />

          {BUILDINGS.filter((b) => b.id !== "gate" || !isSet).map((b) => {
            const gatePrompt = b.id === "gate" && !isSet;
            return (
              <button
                key={b.id}
                onClick={() => tapBuilding(b.id)}
                className="absolute group focus:outline-none active:scale-95 transition-transform"
                style={{
                  left: `${b.map.x}%`,
                  top: `${b.map.y}%`,
                  width: `${b.scale}%`,
                  transform: "translate(-50%, -84%)",
                  zIndex: Math.round(b.map.y),
                }}
                aria-label={`${b.name}, ${b.tagline}`}
              >
                {b.art ? (
                  <Image
                    src={asset(b.art)}
                    alt={b.name}
                    width={1484}
                    height={1060}
                    sizes="30vw"
                    className="w-full h-auto select-none [filter:drop-shadow(0_6px_8px_rgba(0,0,0,0.55))]"
                    draggable={false}
                  />
                ) : (
                  <span className="mx-auto flex w-3/5 aspect-square items-center justify-center rounded-full bg-surface-2/80 border border-dashed border-brand/50 backdrop-blur-sm text-base shadow-[0_6px_10px_rgba(0,0,0,0.55)]">
                    {PLACEHOLDER_ICON[b.id] ?? "🏛"}
                  </span>
                )}

                {/* Compact always-on nameplate (no hover on touch), so the small
                    fit-to-screen buildings are still legible + readable as taps. */}
                <span
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-0.5 whitespace-nowrap rounded bg-bg/80 px-1.5 py-0.5 backdrop-blur-sm ${
                    gatePrompt ? "ring-1 ring-brand/50" : ""
                  }`}
                >
                  <span className="block font-display text-brand text-[9px] leading-none text-center">
                    {b.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* World + building music (one persistent player, re-pointed; null fades out). */}
      <BuildingAudio src={sound} volume={tour.active ? 0.2 : undefined} />

      {/* STEP INSIDE: the building's interior fills the screen with the feature
          panel on top (the shared desktop sheet). Back returns to the map. */}
      {inside && (
        <InteriorView
          id={inside}
          onBack={() => {
            setInside(null);
            clearPending();
          }}
        />
      )}

      {/* Guided tour (mobile): same narration; opens each building's interior. */}
      {tour.active && tour.beat && <TourNarration />}

      {/* Mock-only: a round "?" help affordance to replay the guided tour. */}
      {USE_MOCK && isSet && !tour.active && !inside && (
        <div className="fixed bottom-3 right-3 z-40">
          <ImageButton name="question" label="Replay the guided tour" onClick={tour.start} width={44} />
        </div>
      )}

      {/* Entry gate: whenever there's no identity, cover the village with the
          connect-or-guest fork (sits under the first-visit intro at z-50). */}
      {!isSet && <MobileGate />}
    </main>
  );
}

/* The mobile entry surface, shown whenever there is no identity. Mirrors the
   desktop GateLanding's purpose (choose how you enter) using the shared
   EntryFork, so the low-friction guest path is never desktop-only. */
function MobileGate() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-bg/95 backdrop-blur-sm">
      <div className="px-6 pt-6">
        <span className="font-display text-2xl text-brand tracking-wide">PYRE</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-sm rounded-2xl bg-surface/90 border border-brand/20 p-6 shadow-panel ring-1 ring-inset ring-white/5">
          <EntryFork />
        </div>
      </div>
    </div>
  );
}
