"use client";

/* VILLAGE SHELL — the desktop experience. A top-down village: every building
   wears an always-on nameplate (name + tagline). Two-step entry:
     1. Click a building → "at the door" preview: zoom in on the exterior, show
        its name + description + an "Enter [building]" button.
     2. Click Enter → step inside: the feature panel, which the designer's
        INTERIOR art will frame. Leave to return to the village.
   The Gate is the connect prompt: clicking it (when disconnected) opens a
   connect panel with clear feedback; on connect the village wakes and it closes.
   Spec: 04-village-world.md (nameplates, cinematic entry).

   The map background and interior frames are PLACEHOLDERS. When the designer
   delivers art: drop the village map in as the canvas background, nudge hotspot
   coords in components/buildings.tsx, and drop interiors into the `inside` frame. */

import { useEffect, useState } from "react";
import { BUILDINGS, BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";
import { GatePanel } from "@/components/panels/gate";
import { useWallet } from "@/lib/wallet";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";

type View = { id: BuildingId; mode: "preview" | "inside" | "connect" } | null;

const enterLabel = (name: string) => `Enter ${name.replace(/^The /, "the ")}`;

export function VillageShell() {
  const [view, setView] = useState<View>(null);
  const { status } = useWallet();
  const { isSet } = useIdentity();
  const { pending } = useNavigation();
  // The village wakes for anyone who's entered — wallet OR guest (connecting is
  // never forced). A guest shouldn't be greeted by a sleeping village.
  const awake = status === "connected" || isSet;

  // Once awake, close the Gate's connect overlay and reveal the woken village.
  useEffect(() => {
    if (awake) setView((v) => (v?.id === "gate" ? null : v));
  }, [awake]);

  // Honour a deep-link (e.g. intro → Ashen Cup): step inside the target building.
  // The Ashen Cup panel then opens the right tab and clears the pending target.
  useEffect(() => {
    if (pending && pending.building !== "gate") {
      setView({ id: pending.building as BuildingId, mode: "inside" });
    }
  }, [pending]);

  const clickBuilding = (id: BuildingId) => {
    if (id === "gate") {
      if (!awake) setView({ id: "gate", mode: "connect" });
      return; // when awake, the Gate has no panel to open
    }
    setView({ id, mode: "preview" });
  };

  return (
    <main className="min-h-dvh relative overflow-hidden">
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        <span className="font-display text-3xl text-brand tracking-wide">PYRE</span>
        {/* No "Connect" here — the Gate is the connect prompt. Account chip only. */}
        <ConnectButton connectedOnly />
      </header>

      {/* Placeholder village canvas — swap for the designer's art. Clearly dim
          while dormant; warms and brightens when the wallet connects. */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 65%, #1a1410, var(--color-bg) 75%)",
          filter: awake ? "none" : "grayscale(0.7) brightness(0.4)",
          transition: "filter var(--duration-entry) var(--ease-warm)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-text-3/30 text-sm uppercase tracking-[0.3em] pointer-events-none">
          village art canvas
        </div>

        {/* Dormant hint — placed near the top so it never collides with the
            Gate nameplate (bottom-centre). The pulsing Gate draws the eye. */}
        {!awake && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none px-4">
            <p className="text-brand/80 text-base font-display">The village sleeps</p>
            <p className="text-text-3 text-xs">Light the lantern at the Gate to wake it</p>
          </div>
        )}

        {BUILDINGS.map((b) => {
          const gatePrompt = b.id === "gate" && !awake;
          return (
            <button
              key={b.id}
              onClick={() => clickBuilding(b.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${b.map.x}%`, top: `${b.map.y}%` }}
            >
              <div
                className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl transition-all duration-base ${
                  gatePrompt
                    ? "bg-surface-2 border-2 border-brand shadow-glow animate-pulse"
                    : "bg-surface-2/80 border border-surface-3 group-hover:border-brand group-hover:shadow-glow"
                }`}
              >
                {b.id === "gate" ? "🏮" : b.id === "bonfire" ? "🔥" : "🏛"}
              </div>
              <div className="mt-1 text-center">
                <div className="font-display text-brand text-sm leading-none">{b.name}</div>
                <div className="text-text-3 text-[10px] uppercase tracking-wide">{b.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Gate — connect prompt (clear feedback while connecting) */}
      {view?.mode === "connect" && (
        <Overlay onClose={() => setView(null)}>
          <div className="rounded-panel bg-surface border border-surface-3/60 shadow-panel">
            <GatePanel />
          </div>
        </Overlay>
      )}

      {/* STEP 1 — at the door (preview) */}
      {view?.mode === "preview" && (
        <Overlay onClose={() => setView(null)}>
          <DoorPreview id={view.id} onEnter={() => setView({ id: view.id, mode: "inside" })} />
        </Overlay>
      )}

      {/* STEP 2 — inside (the interior + panel) */}
      {view?.mode === "inside" && (
        <Overlay onClose={() => setView(null)}>
          <Interior id={view.id} onBack={() => setView({ id: view.id, mode: "preview" })} />
        </Overlay>
      )}
    </main>
  );
}

/* Shared dim backdrop + entry animation container. */
function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-entry w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* The "standing at the door" card: exterior close-up + name + description. */
function DoorPreview({ id, onEnter }: { id: BuildingId; onEnter: () => void }) {
  const b = BUILDING_BY_ID[id];
  return (
    <div className="rounded-panel bg-surface border border-surface-3/60 shadow-panel overflow-hidden text-center">
      {/* Exterior close-up — placeholder for the designer's building art. */}
      <div
        className="h-44 flex items-center justify-center text-6xl border-b border-surface-3/60"
        style={{ background: "radial-gradient(circle at 50% 70%, #221a12, var(--color-surface) 75%)" }}
      >
        {id === "bonfire" ? "🔥" : "🏛"}
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

/* Inside the building: the feature panel, framed where interior art will go. */
function Interior({ id, onBack }: { id: BuildingId; onBack: () => void }) {
  const b = BUILDING_BY_ID[id];
  const Panel = b.Panel;
  return (
    <div className="space-y-3">
      {/* Interior art frame — placeholder. Designer's interior drops in here. */}
      <div className="rounded-panel p-1 bg-surface-2/40 border border-surface-3/40">
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
