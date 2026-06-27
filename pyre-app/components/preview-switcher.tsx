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
  { id: "fresh", label: "Fresh wallet (testing)", hint: "Brand-new at launch: 0 $PYRE, all buildings locked until you buy" },
  { id: "newcomer", label: "New wallet", hint: "Test wallet: 1M $PYRE + 100 ETH to burn up the tiers" },
  { id: "burner", label: "Burning", hint: "Mid-progression: FLAME, staked, climbing" },
  { id: "veteran", label: "Immolated", hint: "Everything unlocked: PYRE stage, Hall member" },
];

export function PreviewSwitcher() {
  const { persona, setPersona, launched, setLaunched } = usePreview();
  const { status, connect } = useWallet();

  if (!USE_MOCK) return null;

  const select = (p: Persona) => {
    setPersona(p);
    if (status !== "connected") connect(); // populate gated panels
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 rounded-lg bg-surface-2/95 border border-surface-3 shadow-panel px-3 py-2 backdrop-blur max-w-[calc(100vw-1.5rem)] space-y-2">
      <div>
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

      {/* Launch phase. Pre-launch seals every building except the Ashen Cup and
          runs the tour in future tense; Launched opens the whole world. Mirrors
          the NEXT_PUBLIC_LAUNCHED deploy flag, flippable here to preview both. */}
      <div>
        <div className="text-text-3 text-[10px] uppercase tracking-widest mb-1.5">
          Phase
        </div>
        <div className="flex gap-1">
          {[
            { v: false, label: "Pre-launch", hint: "Everything sealed except the Ashen Cup" },
            { v: true, label: "Launched", hint: "Every building open against the contracts" },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setLaunched(o.v)}
              title={o.hint}
              className={`rounded-sm px-2.5 py-1 text-xs transition-colors duration-fast ${
                launched === o.v ? "bg-brand text-bg" : "bg-surface text-text-2 hover:text-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
