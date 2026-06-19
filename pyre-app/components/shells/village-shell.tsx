"use client";

/* VILLAGE SHELL — the desktop experience. A top-down village rendered on the
   designer's world map (used AS DELIVERED — original files, no resizing). Every
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
import { GatePanel } from "@/components/panels/gate";
import { useWallet } from "@/lib/wallet";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { asset, USE_MOCK } from "@/lib/config";

type View = { id: BuildingId; mode: "preview" | "inside" | "connect" } | null;
type Placement = { x: number; y: number; scale: number };
type Layout = Record<string, Placement>;

const enterLabel = (name: string) => `Enter ${name.replace(/^The /, "the ")}`;

/* The world map's aspect ratio — the full, original Pyre_World_Clean.png
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
  const { status } = useWallet();
  const { isSet } = useIdentity();
  const { pending, clearPending } = useNavigation();
  const awake = status === "connected" || isSet;

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

  const clickBuilding = (id: BuildingId) => {
    if (edit) {
      setSel(id);
      return;
    }
    if (id === "gate") {
      if (!awake) setView({ id: "gate", mode: "connect" });
      return;
    }
    setView({ id, mode: "preview" });
  };

  return (
    <main className="min-h-dvh relative overflow-hidden bg-bg">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          PYRE
        </span>
        <ConnectButton connectedOnly />
      </header>

      {/* The world. A stage that covers the viewport at the map's ratio; the map
          fills it and buildings sit on top by %-coordinate. */}
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
        {/* Map background — original Pyre_World_Clean.png, untouched. */}
        <Image
          src={asset("/world/map.webp")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover select-none pointer-events-none"
        />

        {BUILDINGS.map((b) => {
          const lay = layout[b.id] ?? { x: b.map.x, y: b.map.y, scale: b.scale };
          const gatePrompt = b.id === "gate" && !awake && !edit;
          const selected = edit && sel === b.id;
          return (
            <button
              key={b.id}
              onClick={() => clickBuilding(b.id)}
              onPointerDown={(e) => startDrag(b.id, e)}
              /* Base-anchored: the ground point (x/y) sits at the building's
                 footing. Depth-sorted by y so nearer buildings draw in front. */
              className={`absolute group focus:outline-none ${edit ? "cursor-move" : ""}`}
              style={{
                left: `${lay.x}%`,
                top: `${lay.y}%`,
                width: `${lay.scale}%`,
                transform: "translate(-50%, -84%)",
                zIndex: selected ? 999 : Math.round(lay.y),
                touchAction: "none",
              }}
              aria-label={`${b.name} — ${b.tagline}`}
            >
              {b.art ? (
                <span
                  className={`block relative transition-[filter] duration-base ${
                    gatePrompt ? "animate-pulse" : ""
                  }`}
                  style={{
                    filter: gatePrompt
                      ? "drop-shadow(0 6px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(240,169,59,0.9))"
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
                /* Art not delivered / pulled — a compact labelled signpost. */
                <span className="mx-auto flex w-3/5 aspect-square items-center justify-center rounded-full bg-surface-2/80 border border-dashed border-brand/50 backdrop-blur-sm text-3xl shadow-[0_8px_14px_rgba(0,0,0,0.55)] group-hover:border-brand group-hover:shadow-glow transition-all duration-base">
                  {PLACEHOLDER_ICON[b.id] ?? "🏛"}
                </span>
              )}

              {/* Selection outline while editing. */}
              {selected && (
                <span className="pointer-events-none absolute inset-0 ring-2 ring-brand rounded-md" />
              )}

              {/* Nameplate — above the building. Always shown while editing, for
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

      {/* Dormant hint */}
      {!awake && !edit && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none px-4 z-10">
          <p className="text-brand/90 text-base font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            The village sleeps
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

      {/* Gate — connect prompt */}
      {view?.mode === "connect" && (
        <Overlay onClose={() => setView(null)}>
          <div className="rounded-panel bg-surface border border-surface-3/60 shadow-panel">
            <GatePanel />
          </div>
        </Overlay>
      )}

      {/* STEP 1 — at the door */}
      {view?.mode === "preview" && (
        <Overlay onClose={() => setView(null)}>
          <DoorPreview id={view.id} onEnter={() => setView({ id: view.id, mode: "inside" })} />
        </Overlay>
      )}

      {/* STEP 2 — inside */}
      {view?.mode === "inside" && (
        <Overlay onClose={() => setView(null)}>
          <Interior id={view.id} onBack={() => setView({ id: view.id, mode: "preview" })} />
        </Overlay>
      )}
    </main>
  );
}

/* The hand-placement editor — drag buildings on the map, resize the selected
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
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="animate-entry w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
