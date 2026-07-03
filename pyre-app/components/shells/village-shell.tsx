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
import { CodexButton, CodexRiteLink } from "@/components/codex";
import { GameIcon } from "@/components/ui/game-icon";
import { useLocks, type LockState } from "@/lib/unlocks";
import { GateLanding } from "@/components/gate-landing";
import { BuildingAudio } from "@/components/world-audio";
import { TourNarration } from "@/components/tour-ui";
import { useTour } from "@/lib/tour";
import { GatePanel } from "@/components/panels/gate";
import { useWallet } from "@/lib/wallet";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { asset, USE_MOCK } from "@/lib/config";
import { playDoor, playZoom } from "@/lib/sfx";

type View = { id: BuildingId; mode: "preview" | "inside" | "connect" } | null;

const enterLabel = (name: string) => `Enter ${name.replace(/^The /, "the ")}`;

/* The village world's own background theme, played while roaming the map (no
   building open). Each building swaps in its own track on entry. */
export const WORLD_THEME = "/world/audio/world.mp3";

/* The world map's aspect ratio, the full, original Pyre_World_Clean.png
   (6688×3764). The stage COVERS the viewport at this ratio so building
   %-coords track the artwork however the window is shaped. */
export const MAP_RATIO = 6688 / 3764; // ≈ 1.777

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
  const { status, initializing } = useWallet();
  const { isSet } = useIdentity();
  const { pending, clearPending, syncUrl } = useNavigation();
  const awake = status === "connected" || isSet;
  const tour = useTour();
  const lockOf = useLocks();
  // A locked building shows its dimmed exterior + "how to unlock" instead of opening.
  const [lockedId, setLockedId] = useState<BuildingId | null>(null);

  // Manual WORLD ZOOM (a tuning control): Ctrl/⌘+Scroll over the open map zooms
  // the village camera itself instead of the browser (which otherwise scales the
  // whole page, panels included). Lets us dial in the right resting framing.
  // Min is 1.0 (full cover): below that the map can't fill the viewport and the
  // black behind it would show.
  const [worldZoom, setWorldZoom] = useState(1);
  // True only WHILE actively wheel-zooming, so we can make that one gesture snappy
  // without desyncing the scale and pan when flying back from a building (which
  // briefly exposed the black map backdrop on the panned side).
  const [zooming, setZooming] = useState(false);
  const zoomStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Once awake, close the Gate's connect overlay and reveal the woken village.
  useEffect(() => {
    if (awake) setView((v) => (v?.id === "gate" ? null : v));
  }, [awake]);

  // The Gate landing (desktop): the first thing a visitor without an identity
  // sees. It lingers through a fade after the village wakes (so it cross-fades
  // into the lit village) before unmounting.
  const [gateLandingUp, setGateLandingUp] = useState(false);
  useEffect(() => {
    // Hold the gate back while a saved wallet is being restored: a returning
    // visitor should wake straight into the village, never flash the connect gate.
    if (!awake && !initializing) setGateLandingUp(true);
  }, [awake, initializing]);

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
    const target = pending.building as BuildingId;
    // A CTA pointing at a locked building shows its locked door, not the panel.
    if (lockOf(target).locked) {
      setLockedId(target);
      clearPending();
      return;
    }
    setView({ id: target, mode: "inside" });
    if (!pending.tab) clearPending();
  }, [pending, clearPending, lockOf]);

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
      return { z: worldZoom, tx: 0, ty: 0 };
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

  // One transition shared by the camera's scale AND pan, so they never desync.
  // Snappy only mid-gesture on the open map; cinematic everywhere else.
  const camTransition =
    zooming && !focusBuilding
      ? "transform 140ms ease-out"
      : "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)";

  // The tour drives the interior: an "inside" beat opens the building; an
  // "outside" beat closes whatever the tour opened.
  useEffect(() => {
    if (!tour.active) return;
    if (tour.beat?.phase === "inside" && tour.beat.building) {
      const id = tour.beat.building;
      // Stepping inside during the tour plays the same door SFX as a normal Enter
      // (mixes over the dimmed ambience bed), so entering feels identical. Only
      // buildings you actually walk into through a door (those with an exterior).
      if (BUILDING_BY_ID[id].exterior) playDoor(id);
      setView({ id, mode: "inside" });
    } else {
      setView((v) => (v?.mode === "inside" ? null : v));
    }
  }, [tour.active, tour.beat]);

  // A starting tour takes over the camera; drop any manual building focus.
  useEffect(() => {
    if (tour.active) setFocusId(null);
  }, [tour.active]);

  // The open map is showing (not the tour, no building focused / locked / open):
  // only then does Ctrl+Scroll drive the world zoom. Kept in a ref so the
  // attach-once wheel listener reads the latest value without re-binding.
  const onOpenMap = awake && !tour.active && !focusId && !lockedId && !view;
  const canZoomRef = useRef(false);
  canZoomRef.current = onOpenMap;
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // normal scroll / trackpad pan untouched
      // Ctrl/⌘+wheel is the browser zoom gesture; inside this fixed game layout it
      // only ever scales the panels and breaks things, so we always swallow it and
      // turn it into camera zoom while the open map is up.
      e.preventDefault();
      if (!canZoomRef.current) return;
      setZooming(true);
      if (zoomStopTimer.current) clearTimeout(zoomStopTimer.current);
      // Settle back to the smooth (in-sync) transition shortly after the gesture
      // ends, so a later building fly-out is never snappy/desynced.
      zoomStopTimer.current = setTimeout(() => setZooming(false), 220);
      setWorldZoom((z) => {
        const next = z * (e.deltaY < 0 ? 1.08 : 1 / 1.08);
        return Math.min(2.5, Math.max(1, Math.round(next * 100) / 100));
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (zoomStopTimer.current) clearTimeout(zoomStopTimer.current);
    };
  }, []);

  const clickBuilding = (id: BuildingId) => {
    if (tour.active) return; // the tour drives navigation
    const lock = lockOf(id);
    if (lock.locked) {
      playZoom();
      setLockedId(id);
      return;
    }
    // A camera whoosh accompanies the fly-in; the building's loop music only
    // starts once the camera lands (gated on `arrived` in the audio block below).
    playZoom();
    // Every building (including the Bonfire and Gate) zooms in first; once the
    // camera lands, the destination is revealed: the 7 real buildings show their
    // exterior "at the door" scene, the Bonfire its scene, the Gate its connect
    // prompt (see the `arrived` effects above).
    setFocusId(id);
  };

  return (
    <main className="min-h-dvh relative overflow-hidden bg-bg">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <img
          src={asset("/brand/text-color.png")}
          alt="Pyre"
          draggable={false}
          className="h-8 w-auto select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        />
      </header>

      {/* Your standing, top-right: one box with identity, disconnect, and the
          key personal numbers (rites, yield, Acolyte, staked, drip). Hidden during
          the tour so it can't be used to divert off the guided walk. */}
      {awake && !tour.active && (
        <div className="absolute right-4 top-4 z-30">
          <WorldLedger />
        </div>
      )}

      {/* World-zoom readout (tuning aid): shows the live camera zoom while the open
          map is up, with a reset. Ctrl/⌘+Scroll over the map adjusts it. */}
      {onOpenMap && (
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-2/85 px-3 py-2 text-xs text-text-2 backdrop-blur">
          <span className="text-text-3">Ctrl+Scroll to zoom</span>
          <span className="font-mono text-text">{worldZoom.toFixed(2)}×</span>
          {worldZoom !== 1 && (
            <button
              onClick={() => setWorldZoom(1)}
              className="rounded bg-surface-3/80 px-2 py-0.5 text-text-3 hover:text-text transition-colors"
            >
              Reset
            </button>
          )}
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
            // Snappy ONLY during an active Ctrl+Scroll gesture; otherwise the
            // cinematic 1200ms, kept identical to the pan below so the scale and
            // pan stay in lockstep flying back from a building (a desync briefly
            // exposed the black map backdrop on the panned side).
            transition: camTransition,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${cam.tx}px, ${cam.ty}px)`,
              transition: camTransition,
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
                 footing. Depth-sorted by y so nearer buildings draw in front.
                 During the tour the buildings go pointer-events-none, so no hover
                 glow / nameplate / cursor can distract from the guided walk (the
                 tour's own focus glow is an inline filter, so it still shows). */
              className={`absolute group focus:outline-none transition-opacity duration-base ${
                tourDim ? "opacity-20" : "opacity-100"
              } ${tour.active ? "pointer-events-none" : ""}`}
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
                  /* Resting drop-shadow always. On hover, a LAYERED ember glow: a
                     tight warm rim hugging the silhouette + a faint wider bloom (both
                     low-opacity, not one flat halo), plus a slight brighten, so it
                     reads as lit from the fire rather than outlined in orange. The
                     tour's focus glow (inline filter below) overrides this when active. */
                  className="block relative transition-[filter] duration-base ease-out [filter:drop-shadow(0_10px_12px_rgba(0,0,0,0.55))] group-hover:[filter:drop-shadow(0_10px_12px_rgba(0,0,0,0.55))_drop-shadow(0_0_7px_rgba(255,193,115,0.5))_drop-shadow(0_0_22px_rgba(245,150,55,0.26))_brightness(1.06)]"
                  style={
                    tourFocus
                      ? {
                          filter:
                            "drop-shadow(0 10px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(240,169,59,0.6))",
                        }
                      : undefined
                  }
                >
                  {/* The Bonfire is the living center: an alpha (transparent)
                      WebM loops in place of the static cutout. Same composition,
                      so it sits on the map exactly like the other art. The static
                      webp is the poster (instant first frame + fallback). */}
                  {b.id === "bonfire" ? (
                    <video
                      src={asset("/world/buildings/bonfire.webm")}
                      poster={asset(b.art)}
                      width={1484}
                      height={1060}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto select-none pointer-events-none"
                    />
                  ) : (
                    <Image
                      src={asset(b.art)}
                      alt={b.name}
                      width={1484}
                      height={1060}
                      sizes="30vw"
                      className="w-full h-auto select-none"
                      draggable={false}
                    />
                  )}
                </span>
              ) : (
                /* Art not delivered / pulled, a compact labelled signpost. */
                <span className="mx-auto flex w-3/5 aspect-square items-center justify-center rounded-full bg-surface-2/80 border border-dashed border-brand/50 backdrop-blur-sm text-3xl shadow-[0_8px_14px_rgba(0,0,0,0.55)] group-hover:border-brand group-hover:shadow-glow transition-all duration-base">
                  {PLACEHOLDER_ICON[b.id] ?? "🏛"}
                </span>
              )}

              {/* Nameplate, above the building. Always shown for the dormant
                  Gate and for placeholders; otherwise on hover. Hidden entirely
                  during the tour so nothing competes with the narration. */}
              <span
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded-md bg-bg/80 px-2.5 py-1 backdrop-blur-sm transition-opacity duration-fast ${
                  tour.active
                    ? "opacity-0"
                    : gatePrompt || !b.art
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
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
      {gateLandingUp && <GateLanding onDone={() => setGateLandingUp(false)} />}

      {/* Restoring a saved wallet: a brief branded splash so the connect gate never
          flashes before the silent reconnect resolves (returning visitors only). */}
      {initializing && !awake && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
          <div className="flex flex-col items-center gap-4">
            <span className="font-display text-4xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              PYRE
            </span>
            <span
              className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand/40 border-t-brand"
              aria-hidden
            />
          </div>
        </div>
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
            onEnter={() => {
              // Door over the music (mixes in, never dims). Keyed to the building
              // so leaving plays the exact same door (see InteriorView).
              playDoor(focusId);
              setView({ id: focusId, mode: "inside" });
            }}
          />
        )}

      {/* TOUR, outside beat: show the building's full exterior SCENE (with its slow
          arrival zoom) as the establishing shot under the narration, so the tour
          shows off the exteriors before stepping inside. Keyed per building so the
          zoom-in replays at each stop. Buildings with no exterior (Bonfire/Gate)
          fall back to the map camera. */}
      {tour.active &&
        tour.beat?.phase === "outside" &&
        !tour.beat.overview &&
        tour.beat.building &&
        BUILDING_BY_ID[tour.beat.building].exterior && (
          <ExteriorScene key={tour.beat.building} id={tour.beat.building} tourMode />
        )}

      {/* World + building music. The village world has its OWN theme that plays
          while you roam the map; opening a building switches to that building's
          track, and leaving it returns to the world theme. Skipped during the
          tour (which has its own narration). */}
      {(() => {
        // A building's track only takes over once we're inside it OR the camera
        // has LANDED on its exterior (`arrived`). During the fly-in the world
        // theme keeps playing under the zoom whoosh, then the building's loop
        // fades in once its exterior is on screen.
        const openId = !tour.active
          ? view?.mode === "inside"
            ? view.id
            : focusId && arrived
              ? focusId
              : null
          : null;
        const buildingSound = openId ? BUILDING_BY_ID[openId].sound ?? null : null;
        // No building open + awake → the village world theme. One persistent
        // player, re-pointed (null = fade out). NOT keyed/remounted per track,
        // that churn is what made playback flaky. See components/world-audio.tsx.
        // During the tour the world theme keeps playing as an ambience bed, but
        // dimmed, so the Emberkeeper's narration / voice-over sits clearly on top.
        const sound = tour.active ? WORLD_THEME : buildingSound ?? (awake ? WORLD_THEME : null);
        return <BuildingAudio src={sound} volume={tour.active ? 0.2 : undefined} />;
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

      {/* A locked building's door: dimmed exterior + how to unlock it. */}
      {lockedId && (
        <LockedExterior id={lockedId} lock={lockOf(lockedId)} onBack={() => setLockedId(null)} />
      )}

      {/* GUIDED TOUR, the Emberkeeper's narration + controls. Drives the camera
          (outside beats) and steps inside the interiors (inside beats) above. */}
      {tour.active && tour.beat && <TourNarration />}

      {/* Bottom-right dock: the Codex sits beside Replay tour (mock-only), kept
          clear of the mute / ? toggles in the corner so nothing overlaps. Hidden
          only during the tour. */}
      {awake && !tour.active && (
        <div className="fixed bottom-3 right-32 z-40 flex items-center gap-2">
          <CodexButton />
          {USE_MOCK && (
            <ImageButton name="replaytour" label="Replay tour" onClick={tour.start} width={150} />
          )}
        </div>
      )}
    </main>
  );
}

/* TourNarration now lives in components/tour-ui.tsx (shared by both shells).
   The camera + interior driving stay here in VillageShell. */

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
export function ExteriorScene({
  id,
  onEnter,
  onBack,
  tourMode = false,
}: {
  id: BuildingId;
  onEnter?: () => void;
  onBack?: () => void;
  /** During the tour the scene is the establishing "you've arrived" shot under the
      narration: keep the art + slow zoom-in, but hide its own Back/Enter/title,
      the narration box names the building and drives "Step inside". */
  tourMode?: boolean;
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
    setTimeout(() => onBack?.(), 320);
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

      {/* Bottom scrim so the title + buttons (or the tour narration) stay readable
          over the art. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/75 to-transparent pointer-events-none" />

      {/* Normal (non-tour) flow: Back + title + Enter. During the tour these are
          hidden, the narration box overlays this scene and drives the steps. */}
      {!tourMode && (
        <>
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
        </>
      )}
    </div>
  );
}

/* A LOCKED building: the same exterior scene, dimmed, with a lock, the reason
   it's closed, and a CTA that walks you to whatever opens it. This is what a
   building shows before launch ("Opens at launch") and, after launch, until you've
   done the thing that unlocks it (see lib/unlocks.ts). Shared by both shells. */
export function LockedExterior({
  id,
  lock,
  onBack,
}: {
  id: BuildingId;
  lock: LockState;
  onBack: () => void;
}) {
  const b = BUILDING_BY_ID[id];
  // Background scene: the exterior if it has one, else its interior (the Bonfire
  // has no exterior), so a locked door always shows the real place behind it.
  const bg = b.exterior ?? b.interior;
  const { navigate } = useNavigation();
  const { status, connect } = useWallet();
  const connecting = status === "connecting";
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const back = () => {
    setLeaving(true);
    setTimeout(onBack, 320);
  };
  const goUnlock = () => {
    if (!lock.cta) return back();
    // A "connect" CTA prompts the wallet in place and keeps this door open: once
    // connected the lock recomputes and the door advances to the next real step
    // (e.g. "Buy $PYRE at the Grand Exchange"). Walking-to-a-building CTAs leave.
    if (lock.cta.connect) {
      connect();
      return;
    }
    const to = lock.cta.to;
    if (!to) return;
    setLeaving(true);
    setTimeout(() => {
      onBack();
      navigate({ building: to });
    }, 220);
  };

  return (
    <div
      className="fixed inset-0 z-[45] overflow-hidden bg-bg transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: shown ? "scale(1)" : "scale(1.12)",
          opacity: shown ? 1 : 0,
          transition: "transform 1400ms cubic-bezier(0.16,1,0.3,1), opacity 600ms ease-out",
        }}
      >
        {bg ? (
          <>
            {/* The building's own scene (its exterior, or the interior for ones
                with no exterior like the Bonfire), gently dimmed so it reads as
                shut while the art is still clearly visible. */}
            <Image
              src={asset(bg)}
              alt=""
              fill
              priority
              sizes="100vw"
              aria-hidden
              className="object-cover scale-125 blur-2xl brightness-[0.8] select-none pointer-events-none"
            />
            <Image
              src={asset(bg)}
              alt={b.name}
              fill
              priority
              sizes="100vw"
              className="object-cover brightness-[0.78] saturate-[0.9] select-none pointer-events-none"
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 40%, #241a10, var(--color-bg) 75%)" }}
          />
        )}
      </div>

      {/* Bottom scrim only, same as the open exterior, so the title + buttons stay
          readable without dimming the whole scene. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/75 to-transparent pointer-events-none" />

      <div className="absolute top-4 left-4 z-10">
        <ImageButton name="return" label="Back to the map" width={252} onClick={back} />
      </div>

      {/* Centered lock crest + building name + label, a lock crest marks the door
          as sealed. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
        <div className="pointer-events-auto w-full max-w-lg text-center animate-entry">
          <GameIcon name="lock" size={104} className="mx-auto mb-3 drop-shadow-[0_4px_14px_rgba(0,0,0,0.8)]" />
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
            <h2 className="font-display text-4xl text-brand drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              {b.name}
            </h2>
          </div>
          <p className="text-text-3 text-xs uppercase tracking-widest mt-1">{lock.label}</p>
          {lock.hint && (
            <p className="text-text-2 text-sm mt-3 max-w-sm mx-auto leading-relaxed">{lock.hint}</p>
          )}
          {lock.cta && (
            <button
              onClick={goUnlock}
              disabled={connecting}
              className="mt-5 rounded-md bg-brand text-bg px-5 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors disabled:opacity-60"
            >
              {lock.cta.connect && connecting ? "Connecting…" : `${lock.cta.label} →`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Inside the building: the interior SCENE fills the whole screen (the room you're
   standing in) and the feature panel floats on top. The scene is a backdrop, so
   object-cover (which fills and lightly crops the edges) is the right fit here.
   Exported so the mobile village reuses it as the full-screen "step inside" sheet. */
export function InteriorView({ id, onBack }: { id: BuildingId; onBack: () => void }) {
  const b = BUILDING_BY_ID[id];
  // During the guided tour the interior is shown UNDER the narration as a backdrop:
  // the visitor must not be able to divert (click a CTA, leave the room), the only
  // way off the tour is "Skip tour". So we hide the Leave button and lock the
  // panel's pointer events while the tour runs. The tour itself drives the door.
  const tour = useTour();
  const locked = tour.active;
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
    // Same door as entering this building (only buildings you actually enter
    // through a door, i.e. those with an exterior; the Bonfire/Gate have none).
    if (b.exterior) playDoor(id);
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

      {!locked && (
        <div className="fixed top-4 left-4 z-10">
          <ImageButton name="return" label={`Leave ${b.name.replace(/^The /, "the ")}`} width={252} onClick={leave} />
        </div>
      )}

      {/* Contextual docs: open the Codex straight to this building's chapter. */}
      {!locked && (
        <div className="fixed top-4 right-4 z-10">
          <CodexRiteLink
            building={id}
            className="rounded-md bg-surface-2/90 border border-surface-3/60 px-3 py-2 backdrop-blur shadow-panel"
          />
        </div>
      )}

      <FitToViewport wide={b.wide}>
        {/* Locked during the tour: the panel is a backdrop to the narration, not
            interactive, so its CTAs can't pull the visitor off the tour. */}
        <div className={locked ? "pointer-events-none" : ""}>
          <BuildingPanel id={id} />
        </div>
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
