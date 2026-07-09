"use client";

/* WORLD MUTE, the shared music on/off preference.

   The mute choice needs to be read in two places: the <audio> element in
   BuildingAudio (to silence it) and the mute BUTTON in the corner dock (which
   lives in the shells, beside the Codex + Replay tour buttons). Lifting it into
   a tiny context lets both read the same state, so the toggle in the dock and
   the audio stay in lockstep. Persisted (safe-storage) so it survives sessions. */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { storageGet, storageSet } from "./safe-storage";

const MUTE_KEY = "pyre_world_muted";

type MuteState = { muted: boolean; toggle: () => void };

const MuteCtx = createContext<MuteState | null>(null);

export function MuteProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);

  // Restore the saved choice once, client-side.
  useEffect(() => {
    setMuted(storageGet(MUTE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      storageSet(MUTE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return <MuteCtx.Provider value={{ muted, toggle }}>{children}</MuteCtx.Provider>;
}

export function useMute(): MuteState {
  // Outside a provider (shouldn't happen in the shells) fall back to a no-op so
  // nothing crashes.
  return useContext(MuteCtx) ?? { muted: false, toggle: () => {} };
}
