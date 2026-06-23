"use client";

/* Design Preview state, lets the designer (and you) flip the previewed user
   between empty/locked and full/unlocked states, so EVERY panel state is
   visible without meeting on-chain thresholds. Mock-only; irrelevant once the
   app reads real chain data. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setMockPersona, type Persona } from "./datasource";
import { LAUNCHED } from "./config";

interface PreviewValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
  /** Runtime launch phase. Mirrors the LAUNCHED build flag, but the Design
      Preview switcher can flip it live (mock only) so the sealed pre-launch
      world and the open launched world can both be previewed without a restart.
      The sealed panels and the guided tour both read this. */
  launched: boolean;
  setLaunched: (v: boolean) => void;
}

const PreviewContext = createContext<PreviewValue | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  // Must match DEFAULT_PERSONA in lib/datasource/mock.ts.
  const [persona, setP] = useState<Persona>("veteran");
  const [launched, setLaunched] = useState<boolean>(LAUNCHED);

  const setPersona = useCallback(
    (p: Persona) => {
      setMockPersona(p);
      setP(p);
      qc.invalidateQueries(); // refetch every panel against the new state
    },
    [qc]
  );

  const value = useMemo(
    () => ({ persona, setPersona, launched, setLaunched }),
    [persona, setPersona, launched]
  );
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview(): PreviewValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used within <PreviewProvider>");
  return ctx;
}
