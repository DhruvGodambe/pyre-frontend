"use client";

/* The Design Preview control, a small fixed panel letting the designer flip the
   previewed user state. Selecting one also connects the mock wallet, so gated
   panels (Amber Vault, Forge, Hall of the Immolated) populate immediately
   instead of showing the connect wall. Mock-only; hidden against real data. */

import { usePreview } from "@/lib/preview";
import { useWallet } from "@/lib/wallet";
import { USE_MOCK } from "@/lib/config";
import type { Persona } from "@/lib/datasource";

const OPTIONS: { id: Persona; label: string; hint: string }[] = [
  { id: "newcomer", label: "New wallet", hint: "Empty & locked states: Pyre Acolyte, Hall sealed" },
  { id: "burner", label: "Burning", hint: "Mid-progression: FLAME, staked, climbing" },
  { id: "veteran", label: "Immolated", hint: "Everything unlocked: PYRE stage, Hall member" },
];

export function PreviewSwitcher() {
  const { persona, setPersona } = usePreview();
  const { status, connect } = useWallet();

  if (!USE_MOCK) return null;

  const select = (p: Persona) => {
    setPersona(p);
    if (status !== "connected") connect(); // populate gated panels
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 rounded-lg bg-surface-2/95 border border-surface-3 shadow-panel px-3 py-2 backdrop-blur max-w-[calc(100vw-1.5rem)]">
      <div className="text-text-3 text-[10px] uppercase tracking-widest mb-1.5">
        Design preview · view as
      </div>
      <div className="flex gap-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => select(o.id)}
            title={o.hint}
            className={`rounded-sm px-2.5 py-1 text-xs transition-colors duration-fast ${
              persona === o.id ? "bg-brand text-bg" : "bg-surface text-text-2 hover:text-text"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
