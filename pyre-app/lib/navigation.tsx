"use client";

/* ============================================================================
   PYRE, In-app navigation intent  (deep-link to a building / panel tab)
   ----------------------------------------------------------------------------
   A tiny shared "where to go next" so one part of the app can send the user
   into a specific building, and even a specific tab inside it. Used by the
   Emberkeeper intro to drop the visitor straight into The Ashen Cup → Quests
   when onboarding ends.

   It's plain React state (not a fire-once event) so a consumer that mounts
   slightly later, e.g. the Ashen Cup panel opening inside the Village shell, 
   still sees the pending target. The consumer that handles it calls
   clearPending() when done.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface NavTarget {
  /** A BuildingId (kept as a string to avoid a lib→components dependency). */
  building: string;
  /** Optional tab id inside that building's panel (e.g. "quests"). */
  tab?: string;
}

interface NavigationValue {
  pending: NavTarget | null;
  navigate: (target: NavTarget) => void;
  clearPending: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<NavTarget | null>(null);

  const navigate = useCallback((target: NavTarget) => setPending(target), []);
  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo(
    () => ({ pending, navigate, clearPending }),
    [pending, navigate, clearPending]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within <NavigationProvider>");
  return ctx;
}
