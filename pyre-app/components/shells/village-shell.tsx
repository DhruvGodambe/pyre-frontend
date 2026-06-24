"use client";

/* VILLAGE SHELL, the desktop experience. A top-down village rendered on the
   designer's world map (used AS DELIVERED, original files, no resizing). Every
   building is a clickable hotspot. Two-step entry:
     1. Click a building → "at the door" preview: its exterior art + Enter button.
     2. Click Enter → step inside: the feature panel, framed by interior art.
   The Gate is the connect prompt.

   LAYOUT EDITOR (mock/dev only): toggle "Edit layout" to DRAG each building to
   its exact spot and resize it. Positions persist to localStorage and can be
   copied out, so the placement is done by hand, not guessed. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BUILDINGS, BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { WorldLedger } from "@/components/world-hud";
import { ImageButton } from "@/components/ui/image-button";
import { BuildingPanel } from "@/components/ui/sealed-preview";
import { GateLanding } from "@/components/gate-landing";
import { BuildingAudio } from "@/components/world-audio";
import { TourNarration, TourHighlight } from "@/components/tour-ui";
import { useTour } from "@/lib/tour";
import { GatePanel } from "@/components/panels/gate";
import { useWallet } from "@/lib/wallet";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { asset, USE_MOCK } from "@/lib/config";

type View = { id: BuildingId; mode: "preview" | "inside" | "connect" } | null;

const enterLabel = (name: string) => `Enter ${name.replace(/^The /, "the ")}`;

/* The world map's aspect ratio, the full, original Pyre_World_Clean.png
   (6688×3764). The stage COVERS the viewport at this ratio so building
   %-coords track the artwork however the window is shaped. */
const MAP_RATIO = 6688 / 3764; // ≈ 1.777

/* Icons for buildings whose art hasn't been delivered / been pulled (shown on a
   placeholder marker instead of building art). */
const PLACEHOLDER_ICON: Partial<Record<BuildingId, string>> = {
  observatory: "🔭",
  tavern: "🍺",
  vault: "🔐",
};

export function VillageShell() {
  const [view, setView] = useState<View>(null);
  // A normal building click zooms in on it (like the tour) and shows its blurb +
  // an Enter button, instead of a flat popup.
  const [focusId, setFocusId] = useState<BuildingId | null>(null);
  // The camera flies into the focused building first; only once it has landed do
  // we reveal its exterior scene, so the zoom-in is actually seen (was hidden
  // behind the scene popping in at the same instant).
  const [arrived, setArrived] = useState(false);
  const { status } = useWallet();
  const { isSet } = useIdentity();
  const { pending, clearPending, syncUrl } = useNavigation();
  const awake = status === "connected" || isSet;
  const tour = useTour();

  // Once awake, close the Gate's connect overlay and reveal the woken village.
  useEffect(() => {
    if (awake) setView((v) => (v?.id === "gate" ? null : v));
  }, [awake]);

  // The Gate landing (desktop): the first thing a visitor without an identity
  // sees. It lingers through a fade after the village wakes (so it cross-fades
  // into the lit village) before unmounting.
  const [gateLandingUp, setGateLandingUp] = useState(false);
  useEffect(() => {
    if (!awake) setGateLandingUp(true);
  }, [awake]);

  // Let the camera zoom (~1.2s, cut a little so the scene cross-fades in over the
  // tail of the motion) land before the destination scene fades in over it. Used
  // by EVERY focused building, including the Bonfire and Gate (which aren't
  // "entered" but still get the same fly-in before their scene appears).
  useEffect(() => {
    if (focusId && !tour.active && view?.mode !== "inside" && view?.mode !== "connect") {
      setArrived(false);
      const t = setTimeout(() => setArrived(true), 760);
      return () => clearTimeout(t);
    }
    setArrived(false);
  }, [focusId, tour.active, view?.mode]);

  // Once the camera has landed, reveal the focused building's destination. The 7
  // real buildings fade in their exterior scene (handled in JSX); the Bonfire and
  // Gate have no "at the door" step, so they go straight to their scene/connect.
  useEffect(() => {
    if (!arrived || !focusId) return;
    if (focusId === "bonfire") setView({ id: "bonfire", mode: "inside" });
    else if (focusId === "gate") setView({ id: "gate", mode: "connect" });
  }, [arrived, focusId]);

  // Honour a deep-link (e.g. intro → Tavern, or a conversion CTA → Forge): step
  // inside the target building. If there's a tab to open, leave `pending` for the
  // panel to consume; otherwise clear it here so it can't re-fire stale.
  useEffect(() => {
    if (!pending || pending.building === "gate") return;
    if (pending.building === "") {
      // Browser Back from a building → return to the map.
      setView(null);
      setFocusId(null);
      clearPending();
      return;
    }
    setView({ id: pending.building as BuildingId, mode: "inside" });
    if (!pending.tab) clearPending();
  }, [pending, clearPending]);

  // Reflect the open building in the URL (no reload), so each has a shareable
  // link (/app/ashencup …). Skipped during the tour (it rips through buildings)
  // and only while awake. Back/forward is handled by the navigation provider.
  useEffect(() => {
    if (!awake || tour.active) return;
    syncUrl(view?.mode === "inside" ? view.id : null);
  }, [awake, tour.active, view, syncUrl]);

  // --- Camera + spotlight -------------------------------------------------
  // The same camera serves the guided tour AND a normal building click. Pan the
  // world so the focused building sits at viewport centre, then zoom. t =
  // -((coord-50)/100 · stageSize); the zoom scales about centre, so the framed
  // building stays put while the rest of the kingdom grows past the edge.
  const focusBuilding: BuildingId | null = tour.active
    ? tour.beat && !tour.beat.overview
      ? tour.beat.building ?? null
      : null
    : focusId;
  // Dim the kingdom + spotlight the focused building (a tour "outside" beat, or
  // a normal building click).
  const spotlightOn =
    (tour.active && tour.beat?.phase === "outside" && !tour.beat?.overview) ||
    (!tour.active && focusId !== null);
  const cam = (() => {
    if (!focusBuilding || typeof window === "undefined") {
      return { z: 1, tx: 0, ty: 0 };
    }
    const { map } = BUILDING_BY_ID[focusBuilding];
    const W = Math.max(window.innerWidth, MAP_RATIO * window.innerHeight);
    const H = Math.max(window.innerHeight, window.innerWidth / MAP_RATIO);
    return {
      z: 2.1,
      tx: -((map.x - 50) / 100) * W,
      ty: -((map.y - 8 - 50) / 100) * H, // -8 frames the body, not the feet
    };
  })();

  // The tour drives the interior: an "inside" beat opens the building; an
  // "outside" beat closes whatever the tour opened.
  useEffect(() => {
    if (!tour.active) return;
    if (tour.beat?.phase === "inside" && tour.beat.building) {
      setView({ id: tour.beat.building, mode: "inside" });
    } else {
      setView((v) => (v?.mode === "inside" ? null : v));
    }
  }, [tour.active, tour.beat]);

  // A starting tour takes over the camera; drop any manual building focus.
  useEffect(() => {
    if (tour.active) setFocusId(null);
  }, [tour.active]);

  const clickBuilding = (id: BuildingId) => {
    if (tour.active) return; // the tour drives navigation
    // Every building (including the Bonfire and Gate) zooms in first; once the
    // camera lands, the destination is revealed: the 7 real buildings show their
    // exterior "at the door" scene, the Bonfire its scene, the Gate its connect
    // prompt (see the `arrived` effects above).
    setFocusId(id);
  };

  return (
    <main className="min-h-dvh relative overflow-hidden bg-bg">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          PYRE
        </span>
      </header>

      {/* Your standing, top-right: one box with identity, disconnect, and the
          key personal numbers (rites, yield, Acolyte, staked, drip). */}
      {awake && (
        <div className="absolute right-4 top-4 z-30">
          <WorldLedger />
        </div>
      )}

      {/* The world. A camera (zoom + pan) wraps a stage that covers the viewport
          at the map's ratio; the map fills it and buildings sit on top by %-
          coordinate. During the guided tour the camera focuses each building. */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${cam.z})`,
            transformOrigin: "center center",
            transition: "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${cam.tx}px, ${cam.ty}px)`,
              transition: "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `max(100vw, ${100 * MAP_RATIO}vh)`,
                height: `max(${100 / MAP_RATIO}vw, 100vh)`,
                filter: awake ? "none" : "grayscale(0.55) brightness(0.5)",
                transition: "filter var(--duration-entry) var(--ease-warm)",
              }}
            >
              {/* Map background, original Pyre_World_Clean.png, untouched. */}
              <Image
                src={asset("/world/map.webp")}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover select-none pointer-events-none"
              />

              {/* Spotlight: darken the map during an outside beat so the framed
                  building reads as lit. Above the map, below the buildings. */}
              {spotlightOn && (
                <div
                  className="absolute inset-0 bg-bg/70 transition-opacity duration-base"
                  style={{ zIndex: 1 }}
                  aria-hidden
                />
              )}

        {BUILDINGS.map((b) => {
          const lay = { x: b.map.x, y: b.map.y, scale: b.scale };
          const gatePrompt = b.id === "gate" && !awake;
          const tourFocus = spotlightOn && focusBuilding === b.id;
          const tourDim = spotlightOn && focusBuilding !== b.id;
          return (
            <button
              key={b.id}
              onClick={() => clickBuilding(b.id)}
              /* Base-anchored: the ground point (x/y) sits at the building's
                 footing. Depth-sorted by y so nearer buildings draw in front. */
              className={`absolute group focus:outline-none transition-opacity duration-base ${
                tourDim ? "opacity-20" : "opacity-100"
              }`}
              style={{
                left: `${lay.x}%`,
                top: `${lay.y}%`,
                width: `${lay.scale}%`,
                transform: "translate(-50%, -84%)",
                zIndex: tourFocus ? 1000 : Math.round(lay.y),
              }}
              aria-label={`${b.name}, ${b.tagline}`}
            >
              {b.art ? (
                <span
                  /* Resting drop-shadow always; on hover a warm ember glow blooms
                     around the building and it lifts slightly. The tour's focus
                     glow (inline filter below) overrides this when active. */
                  className="block relative transition-[filter] duration-base [filter:drop-shadow(0_10px_12px_rgba(0,0,0,0.55))] group-hover:[filter:drop-shadow(0_10px_12px_rgba(0,0,0,0.55))_drop-shadow(0_0_34px_rgba(240,169,59,0.75))]"
                  style={
                    tourFocus
                      ? {
                          filter:
                            "drop-shadow(0 10px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(240,169,59,0.6))",
                        }
                      : undefined
                  }
                >
                  <Image
                    src={asset(b.art)}
                    alt={b.name}
                    width={1484}
                    height={1060}
                    sizes="30vw"
                    className="w-full h-auto select-none"
                    draggable={false}
                  />
                </span>
              ) : (
                /* Art not delivered / pulled, a compact labelled signpost. */
                <span className="mx-auto flex w-3/5 aspect-square items-center justify-center rounded-full bg-surface-2/80 border border-dashed border-brand/50 backdrop-blur-sm text-3xl shadow-[0_8px_14px_rgba(0,0,0,0.55)] group-hover:border-brand group-hover:shadow-glow transition-all duration-base">
                  {PLACEHOLDER_ICON[b.id] ?? "🏛"}
                </span>
              )}

              {/* Nameplate, above the building. Always shown for the dormant
                  Gate and for placeholders; otherwise on hover. */}
              <span
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded-md bg-bg/80 px-2.5 py-1 backdrop-blur-sm transition-opacity duration-fast ${
                  gatePrompt || !b.art ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <span className="block font-display text-brand text-base leading-none text-center">
                  {b.name}
                </span>
                <span className="block text-text-2 text-[10px] uppercase tracking-wide text-center">
                  {b.tagline}
                </span>
              </span>
            </button>
          );
        })}
            </div>
          </div>
        </div>
      </div>

      {/* Dormant: the Gate landing covers the screen until an identity is chosen
          (then it fades into the woken village). Replaces the old "Open the Gate"
          hint, the gate IS the entry now. */}
      {gateLandingUp && (
        <GateLanding leaving={awake} onDone={() => setGateLandingUp(false)} />
      )}

      {/* Layout is locked in (hand-placed), so the in-app editor is retired. */}

      {/* Gate, connect prompt. The Gate isn't a building you step into, so there's
          no exterior/Enter beat: its own 16:9 scene fills the screen and the
          connect card floats on top. */}
      {view?.mode === "connect" && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 animate-entry"
          onClick={() => {
            setView(null);
            setFocusId(null); // pull the camera back out to the map
          }}
        >
          <div className="absolute inset-0 -z-10">
            {BUILDING_BY_ID.gate.interior && (
              <Image
                src={asset(BUILDING_BY_ID.gate.interior)}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover select-none pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-bg/55" />
          </div>
          <div
            className="animate-entry w-full max-w-md rounded-2xl bg-surface/80 border border-brand/20 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-inset ring-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ember hairline at the crown */}
            <div className="h-px mx-6 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <GatePanel
              onEntered={() => {
                setView(null);
                setFocusId(null); // also drop the zoom so it doesn't reopen
              }}
            />
          </div>
        </div>
      )}

      {/* STEP 1, at the door: once the camera lands, the building's full exterior
          SCENE fades in with an Enter button. The Bonfire + Gate have no door
          step, so they show nothing here, their `arrived` effect opens their
          scene / connect directly. */}
      {focusId &&
        !tour.active &&
        view?.mode !== "inside" &&
        BUILDING_BY_ID[focusId].exterior &&
        arrived && (
          <ExteriorScene
            id={focusId}
            onBack={() => setFocusId(null)}
            onEnter={() => setView({ id: focusId, mode: "inside" })}
          />
        )}

      {/* Per-building background music: plays while a building is open (its
          exterior view or inside), fades out on leave. Skipped during the tour
          (which has its own narration). */}
      {(() => {
        const openId = !tour.active ? (view?.mode === "inside" ? view.id : focusId) : null;
        // One persistent player, re-pointed at the open building's track (null =
        // fade out). NOT keyed/remounted per building, that churn is exactly what
        // made playback flaky. See components/world-audio.tsx.
        const sound = (openId && BUILDING_BY_ID[openId].sound) || null;
        return <BuildingAudio src={sound} />;
      })()}

      {/* STEP 2, inside: the interior SCENE fills the whole screen and the feature
          panel floats on top of it (you've stepped into the room). */}
      {view?.mode === "inside" && (
        <InteriorView
          id={view.id}
          onBack={() => {
            // Leaving a building returns all the way to the map (camera zooms
            // back out), not back to the exterior door.
            setView(null);
            setFocusId(null);
          }}
        />
      )}

      {/* GUIDED TOUR, the Emberkeeper's narration + controls. Drives the camera
          (outside beats) and the interiors (inside beats) above. */}
      {tour.active && tour.beat && <TourNarration />}

      {/* Coachmark: glow/spotlight the exact UI section the current line is about
          (e.g. the Forge's Stake box), so "you stake here" points somewhere real. */}
      {tour.active && tour.beat?.phase === "inside" && tour.beat.highlight && (
        <TourHighlight targetId={tour.beat.highlight} />
      )}

      {/* Mock-only: replay the guided tour without re-running the whole intro. */}
      {USE_MOCK && awake && !tour.active && (
        <button
          onClick={tour.start}
          className="fixed bottom-3 right-14 z-40 rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
        >
          ▶ Replay tour
        </button>
      )}
    </main>
  );
}

/* TourNarration + TourHighlight now live in components/tour-ui.tsx (shared by
   both shells). The camera + interior driving stay here in VillageShell. */

/* Shared dim backdrop + entry animation container. */
function Overlay({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`animate-entry w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-6xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* The "standing at the door" card: exterior art + name + description. */
function DoorPreview({ id, onEnter }: { id: BuildingId; onEnter: () => void }) {
  const b = BUILDING_BY_ID[id];
  return (
    <div className="rounded-panel bg-surface border border-surface-3/60 shadow-panel overflow-hidden text-center">
      <div
        className="relative h-52 flex items-end justify-center border-b border-surface-3/60"
        style={{ background: "radial-gradient(circle at 50% 75%, #2a2014, var(--color-surface) 78%)" }}
      >
        {b.art ? (
          <Image
            src={asset(b.art)}
            alt={b.name}
            width={1484}
            height={1060}
            className="max-h-[88%] w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <span className="text-6xl pb-6">{PLACEHOLDER_ICON[id] ?? "🏛"}</span>
        )}
      </div>
      <div className="p-6 space-y-3">
        <div>
          <h2 className="font-display text-3xl text-brand">{b.name}</h2>
          <p className="text-text-3 text-xs uppercase tracking-widest mt-1">{b.tagline}</p>
        </div>
        <p className="text-text-2 text-sm max-w-sm mx-auto">{b.description}</p>
        <button
          onClick={onEnter}
          className="mt-2 rounded-md bg-brand text-bg px-5 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors duration-fast"
        >
          {enterLabel(b.name)}
        </button>
      </div>
    </div>
  );
}

/* STEP 1, the new "walk up to the building" view: the building's full exterior
   SCENE fills the screen with a slow zoom-in (you arrive), its name + an Enter
   button over it. Enter steps inside; Back returns to the map. */
function ExteriorScene({
  id,
  onEnter,
  onBack,
}: {
  id: BuildingId;
  onEnter: () => void;
  onBack: () => void;
}) {
  const b = BUILDING_BY_ID[id];
  // Settle from slightly zoomed-in + faded to resting, the "arrive at the door" beat.
  const [shown, setShown] = useState(false);
  // Fade the whole scene out before returning to the map (no hard cut).
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const back = () => {
    setLeaving(true);
    setTimeout(onBack, 320);
  };

  return (
    <div
      className="fixed inset-0 z-[45] overflow-hidden bg-bg transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: shown ? "scale(1)" : "scale(1.22)",
          opacity: shown ? 1 : 0,
          transition: "transform 1900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease-out",
        }}
      >
        {/* The exteriors are now true 16:9 full scenes, so they fill the screen
            edge-to-edge (object-cover). A blurred copy sits underneath as a safety
            backdrop for the off-16:9 desktop aspect ratios (ultrawide, 16:10), so
            any sliver the cover leaves never shows a hard edge. */}
        <Image
          src={asset(b.exterior!)}
          alt=""
          fill
          priority
          sizes="100vw"
          aria-hidden
          className="object-cover scale-125 blur-2xl brightness-[0.85] select-none pointer-events-none"
        />
        <Image
          src={asset(b.exterior!)}
          alt={b.name}
          fill
          priority
          sizes="100vw"
          className="object-cover select-none pointer-events-none"
        />
      </div>

      {/* Bottom scrim so the title + buttons stay readable over the art. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/75 to-transparent pointer-events-none" />

      <div className="absolute top-4 left-4 z-10">
        <ImageButton name="return" label="Back to the map" width={252} onClick={back} />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-6">
        <div className="w-full max-w-lg text-center animate-entry">
          <div className="flex items-center justify-center gap-3">
            {b.icon && (
              <Image
                src={asset(b.icon)}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain drop-shadow"
              />
            )}
            <h2 className="font-display text-4xl text-brand drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {b.name}
            </h2>
          </div>
          <p className="text-text-3 text-xs uppercase tracking-widest mt-1">{b.tagline}</p>
          <p className="text-text-2 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            {b.description}
          </p>
          <div className="mt-5 flex justify-center">
            <ImageButton name="enter" label={enterLabel(b.name)} width={240} onClick={onEnter} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Inside the building: the interior SCENE fills the whole screen (the room you're
   standing in) and the feature panel floats on top. The scene is a backdrop, so
   object-cover (which fills and lightly crops the edges) is the right fit here. */
function InteriorView({ id, onBack }: { id: BuildingId; onBack: () => void }) {
  const b = BUILDING_BY_ID[id];
  // Fade the room up over a solid base, so stepping inside reads as a smooth
  // reveal (and the map never flashes through during the swap).
  const [shown, setShown] = useState(false);
  // Fade the whole room out on leave, so it cross-fades to the (still zoomed-in)
  // map before the camera pulls back, instead of a hard cut.
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const leave = () => {
    setLeaving(true);
    setTimeout(onBack, 320);
  };
  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-bg transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      {/* The room, full-screen behind everything, fading in. */}
      <div
        className="fixed inset-0 -z-10 transition-opacity duration-500"
        style={{ opacity: shown ? 1 : 0 }}
      >
        {b.interior && (
          <Image
            src={asset(b.interior)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none"
          />
        )}
        {/* Legibility scrim over the room (lighter when there's art to show). */}
        <div className={`absolute inset-0 ${b.interior ? "bg-bg/55" : "bg-bg/92"}`} />
      </div>

      <div className="fixed top-4 left-4 z-10">
        <ImageButton name="return" label={`Leave ${b.name.replace(/^The /, "the ")}`} width={252} onClick={leave} />
      </div>

      <FitToViewport wide={b.wide}>
        <BuildingPanel id={id} />
      </FitToViewport>
    </div>
  );
}

/* A building interior NEVER scrolls. This contains the panel to one screen and,
   only if it would overflow, scales it down to fit (so nothing is clipped and
   nothing scrolls). Re-measures when the content height changes (tab switches,
   data loading) or the window resizes. */
function FitToViewport({ wide, children }: { wide?: boolean; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const avail = outer.clientHeight - 32; // breathing room top + bottom
      const content = inner.scrollHeight; // natural layout height (pre-transform)
      setScale(content > avail ? Math.max(0.5, avail / content) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={outerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden px-4">
      <div
        ref={innerRef}
        className={`w-full ${wide ? "max-w-6xl" : "max-w-lg"} animate-entry`}
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "center" }}
      >
        {children}
      </div>
    </div>
  );
}
