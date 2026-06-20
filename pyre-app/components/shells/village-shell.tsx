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

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BUILDINGS, BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";
import { WorldRiteProgress, WorldProfile } from "@/components/world-hud";
import { TourNarration, TourHighlight } from "@/components/tour-ui";
import { useTour } from "@/lib/tour";
import { GatePanel } from "@/components/panels/gate";
import { useWallet } from "@/lib/wallet";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { asset, USE_MOCK } from "@/lib/config";

type View = { id: BuildingId; mode: "preview" | "inside" | "connect" } | null;
type Placement = { x: number; y: number; scale: number };
type Layout = Record<string, Placement>;

const enterLabel = (name: string) => `Enter ${name.replace(/^The /, "the ")}`;

/* The world map's aspect ratio, the full, original Pyre_World_Clean.png
   (6688×3764). The stage COVERS the viewport at this ratio so building
   %-coords track the artwork however the window is shaped. */
const MAP_RATIO = 6688 / 3764; // ≈ 1.777

const LAYOUT_KEY = "pyre_layout";

/* Icons for buildings whose art hasn't been delivered / been pulled (shown on a
   placeholder marker instead of building art). */
const PLACEHOLDER_ICON: Partial<Record<BuildingId, string>> = {
  observatory: "🔭",
  tavern: "🍺",
  vault: "🔐",
};

const defaultLayout = (): Layout =>
  Object.fromEntries(
    BUILDINGS.map((b) => [b.id, { x: b.map.x, y: b.map.y, scale: b.scale }])
  );

export function VillageShell() {
  const [view, setView] = useState<View>(null);
  // A normal building click zooms in on it (like the tour) and shows its blurb +
  // an Enter button, instead of a flat popup.
  const [focusId, setFocusId] = useState<BuildingId | null>(null);
  const { status } = useWallet();
  const { isSet } = useIdentity();
  const { pending, clearPending } = useNavigation();
  const awake = status === "connected" || isSet;
  const tour = useTour();

  // --- Layout editor state ------------------------------------------------
  const worldRef = useRef<HTMLDivElement>(null);
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState<BuildingId | null>(null);
  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const dragId = useRef<BuildingId | null>(null);

  // Load any saved hand-placed layout once on the client.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) setLayout((l) => ({ ...l, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const save = useCallback((next: Layout) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const onMove = useCallback(
    (e: PointerEvent) => {
      const id = dragId.current;
      const rect = worldRef.current?.getBoundingClientRect();
      if (!id || !rect) return;
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setLayout((l) => {
        const next = { ...l, [id]: { ...l[id], x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } };
        save(next);
        return next;
      });
    },
    [save]
  );

  const onUp = useCallback(() => {
    dragId.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove]);

  const startDrag = (id: BuildingId, e: React.PointerEvent) => {
    if (!edit) return;
    e.preventDefault();
    e.stopPropagation();
    setSel(id);
    dragId.current = id;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const bump = (id: BuildingId, key: keyof Placement, delta: number) =>
    setLayout((l) => {
      const next = { ...l, [id]: { ...l[id], [key]: Math.round((l[id][key] + delta) * 10) / 10 } };
      save(next);
      return next;
    });

  // Once awake, close the Gate's connect overlay and reveal the woken village.
  useEffect(() => {
    if (awake) setView((v) => (v?.id === "gate" ? null : v));
  }, [awake]);

  // Honour a deep-link (e.g. intro → Tavern, or a conversion CTA → Forge): step
  // inside the target building. If there's a tab to open, leave `pending` for the
  // panel to consume; otherwise clear it here so it can't re-fire stale.
  useEffect(() => {
    if (pending && pending.building !== "gate") {
      setView({ id: pending.building as BuildingId, mode: "inside" });
      if (!pending.tab) clearPending();
    }
  }, [pending, clearPending]);

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
    const lay = layout[focusBuilding];
    if (!lay) return { z: 1, tx: 0, ty: 0 };
    const W = Math.max(window.innerWidth, MAP_RATIO * window.innerHeight);
    const H = Math.max(window.innerHeight, window.innerWidth / MAP_RATIO);
    return {
      z: 2.1,
      tx: -((lay.x - 50) / 100) * W,
      ty: -((lay.y - 8 - 50) / 100) * H, // -8 frames the body, not the feet
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
    if (edit) {
      setSel(id);
      return;
    }
    if (id === "gate") {
      if (!awake) setView({ id: "gate", mode: "connect" });
      return;
    }
    setFocusId(id); // zoom in + spotlight + show the building's blurb
  };

  return (
    <main className="min-h-dvh relative overflow-hidden bg-bg">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          PYRE
        </span>
        <div className="flex items-center gap-3">
          {awake && !edit && <WorldRiteProgress />}
          <ConnectButton connectedOnly />
        </div>
      </header>

      {/* Profile, bottom-left. Sits above the mock Preview switcher in dev; at the
          corner in production (where the switcher doesn't ship). */}
      {awake && !edit && (
        <div className={`absolute left-4 z-20 ${USE_MOCK ? "bottom-20" : "bottom-4"}`}>
          <WorldProfile />
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
              ref={worldRef}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `max(100vw, ${100 * MAP_RATIO}vh)`,
                height: `max(${100 / MAP_RATIO}vw, 100vh)`,
                filter: awake || edit ? "none" : "grayscale(0.55) brightness(0.5)",
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
          const lay = layout[b.id] ?? { x: b.map.x, y: b.map.y, scale: b.scale };
          const gatePrompt = b.id === "gate" && !awake && !edit;
          const selected = edit && sel === b.id;
          const tourFocus = spotlightOn && focusBuilding === b.id;
          const tourDim = spotlightOn && focusBuilding !== b.id;
          return (
            <button
              key={b.id}
              onClick={() => clickBuilding(b.id)}
              onPointerDown={(e) => startDrag(b.id, e)}
              /* Base-anchored: the ground point (x/y) sits at the building's
                 footing. Depth-sorted by y so nearer buildings draw in front. */
              className={`absolute group focus:outline-none transition-opacity duration-base ${
                edit ? "cursor-move" : ""
              } ${tourDim ? "opacity-20" : "opacity-100"}`}
              style={{
                left: `${lay.x}%`,
                top: `${lay.y}%`,
                width: `${lay.scale}%`,
                transform: "translate(-50%, -84%)",
                zIndex: tourFocus ? 1000 : selected ? 999 : Math.round(lay.y),
                touchAction: "none",
              }}
              aria-label={`${b.name}, ${b.tagline}`}
            >
              {b.art ? (
                <span
                  className="block relative"
                  style={{
                    filter: tourFocus
                      ? "drop-shadow(0 10px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(240,169,59,0.6))"
                      : "drop-shadow(0 10px 12px rgba(0,0,0,0.55))",
                  }}
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

              {/* Selection outline while editing. */}
              {selected && (
                <span className="pointer-events-none absolute inset-0 ring-2 ring-brand rounded-md" />
              )}

              {/* Nameplate, above the building. Always shown while editing, for
                  the dormant Gate, and for placeholders; otherwise on hover. */}
              <span
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded-md bg-bg/80 px-2.5 py-1 backdrop-blur-sm transition-opacity duration-fast ${
                  gatePrompt || edit || !b.art ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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

      {/* Dormant hint */}
      {!awake && !edit && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none px-4 z-10">
          <p className="text-brand/90 text-base font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            The kingdom sleeps
          </p>
          <p className="text-text-2 text-xs drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            Light the lantern at the Gate to wake it
          </p>
        </div>
      )}

      {/* LAYOUT EDITOR (mock only) */}
      {USE_MOCK && (
        <LayoutEditor
          edit={edit}
          setEdit={setEdit}
          sel={sel}
          layout={layout}
          onBump={bump}
          onReset={() => {
            const d = defaultLayout();
            setLayout(d);
            save(d);
          }}
        />
      )}

      {/* Gate, connect prompt */}
      {view?.mode === "connect" && (
        <Overlay onClose={() => setView(null)}>
          <div className="rounded-panel bg-surface border border-surface-3/60 shadow-panel">
            <GatePanel onEntered={() => setView(null)} />
          </div>
        </Overlay>
      )}

      {/* STEP 1, at the door: a building click zooms in + spotlights it (camera
          above), and this blurb explains it with a way in. Hidden once inside. */}
      {focusId && !tour.active && view?.mode !== "inside" && (
        <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-panel bg-surface/95 border border-surface-3/60 shadow-panel backdrop-blur p-5 text-center animate-entry">
            <div className="text-text-3 text-[11px] uppercase tracking-widest">
              {BUILDING_BY_ID[focusId].tagline}
            </div>
            <h2 className="font-display text-2xl text-brand mt-0.5">
              {BUILDING_BY_ID[focusId].name}
            </h2>
            <p className="text-text-2 text-sm mt-2 leading-relaxed">
              {BUILDING_BY_ID[focusId].description}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setFocusId(null)}
                className="text-text-3 text-sm hover:text-text-2 transition-colors px-3 py-2"
              >
                ← Back
              </button>
              <button
                onClick={() => setView({ id: focusId, mode: "inside" })}
                className="rounded-md bg-brand text-bg px-6 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
              >
                {enterLabel(BUILDING_BY_ID[focusId].name)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2, inside. Back returns to the zoomed-in blurb (focus), not a popup. */}
      {view?.mode === "inside" && (
        <Overlay onClose={() => setView(null)} wide={BUILDING_BY_ID[view.id]?.wide}>
          <Interior id={view.id} onBack={() => setView(null)} />
        </Overlay>
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
      {USE_MOCK && awake && !edit && !tour.active && (
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

/* The hand-placement editor, drag buildings on the map, resize the selected
   one, copy the resulting coordinates. Mock/dev only. */
function LayoutEditor({
  edit,
  setEdit,
  sel,
  layout,
  onBump,
  onReset,
}: {
  edit: boolean;
  setEdit: (v: boolean) => void;
  sel: BuildingId | null;
  layout: Layout;
  onBump: (id: BuildingId, key: keyof Placement, delta: number) => void;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const selLay = sel ? layout[sel] : null;

  const copy = () => {
    // Registry-ready lines, in the BUILDINGS order.
    const lines = BUILDINGS.map((b) => {
      const l = layout[b.id];
      return `${b.id}: map { x: ${l.x}, y: ${l.y} }, scale: ${l.scale}`;
    }).join("\n");
    navigator.clipboard?.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed top-20 right-4 z-40 w-64 rounded-panel bg-surface/95 border border-surface-3 shadow-panel backdrop-blur p-3 space-y-3 text-sm">
      <button
        onClick={() => setEdit(!edit)}
        className={`w-full rounded-md px-3 py-2 font-medium transition-colors ${
          edit ? "bg-brand text-bg hover:bg-brand-deep" : "bg-surface-2 text-text border border-surface-3 hover:border-brand"
        }`}
      >
        {edit ? "✓ Done placing" : "🛠 Edit layout"}
      </button>

      {edit && (
        <>
          <p className="text-text-3 text-xs leading-relaxed">
            Drag any building to move it. Click one to select, then resize it below.
          </p>

          {sel && selLay ? (
            <div className="rounded-md bg-surface-2 border border-surface-3 p-2 space-y-2">
              <div className="font-display text-brand">{BUILDING_BY_ID[sel].name}</div>
              <div className="tabular text-text-3 text-xs">
                x {selLay.x} · y {selLay.y}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-2 text-xs">Size {selLay.scale}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onBump(sel, "scale", -1)}
                    className="w-7 h-7 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg"
                  >
                    −
                  </button>
                  <button
                    onClick={() => onBump(sel, "scale", 1)}
                    className="w-7 h-7 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-2 text-xs">Nudge</span>
                <div className="grid grid-cols-3 gap-0.5">
                  <span />
                  <button onClick={() => onBump(sel, "y", -0.5)} className="w-6 h-6 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg">↑</button>
                  <span />
                  <button onClick={() => onBump(sel, "x", -0.5)} className="w-6 h-6 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg">←</button>
                  <button onClick={() => onBump(sel, "y", 0.5)} className="w-6 h-6 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg">↓</button>
                  <button onClick={() => onBump(sel, "x", 0.5)} className="w-6 h-6 rounded bg-surface-3 text-text hover:bg-brand hover:text-bg">→</button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text-3 text-xs italic">No building selected.</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-md bg-surface-2 text-text border border-surface-3 px-2 py-1.5 text-xs hover:border-brand"
            >
              {copied ? "Copied ✓" : "Copy coordinates"}
            </button>
            <button
              onClick={onReset}
              className="rounded-md bg-surface-2 text-text-3 border border-surface-3 px-2 py-1.5 text-xs hover:border-danger hover:text-danger"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

/* Inside the building: the feature panel, framed by interior art where delivered. */
function Interior({ id, onBack }: { id: BuildingId; onBack: () => void }) {
  const b = BUILDING_BY_ID[id];
  const Panel = b.Panel;
  return (
    <div className="space-y-3">
      <div className="relative rounded-panel p-1 border border-surface-3/40 overflow-hidden">
        {b.interior && (
          <>
            <Image
              src={asset(b.interior)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover -z-10 select-none pointer-events-none"
            />
            <div className="absolute inset-0 -z-10 bg-bg/72" />
          </>
        )}
        {!b.interior && <div className="absolute inset-0 -z-10 bg-surface-2/40" />}
        <Panel />
      </div>
      <button
        onClick={onBack}
        className="mx-auto block text-text-3 text-xs uppercase tracking-widest hover:text-text"
      >
        ← leave {b.name.replace(/^The /, "the ")}
      </button>
    </div>
  );
}
