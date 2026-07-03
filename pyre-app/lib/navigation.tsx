"use client";

/* ============================================================================
   PYRE, In-app navigation intent + per-building URLs
   ----------------------------------------------------------------------------
   A tiny shared "where to go next" so one part of the app can send the visitor
   into a specific building (and even a tab inside it), AND so every building has
   its own shareable URL, e.g. /kingdom/ashencup opens the Ashen Cup. It stays a
   single-page app: the URL is updated with the History API (no reload), and a
   direct visit / paste deep-links straight into that building.

   `pending` is plain React state (not a fire-once event) so a consumer that
   mounts slightly later still sees the target; the consumer clears it when done.
   A pending building of "" means "back to the map" (used by browser Back).
   ========================================================================== */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KINGDOM_PATH } from "./config";

export interface NavTarget {
  /** A BuildingId, or "" to mean "back to the map" (browser Back). */
  building: string;
  /** Optional tab id inside that building's panel (e.g. "rites"). */
  tab?: string;
}

/* Friendly URL slugs per building. Kept as plain strings here to avoid a
   lib -> components dependency. Keep in sync with BuildingId in
   components/buildings.tsx. */
export const BUILDING_SLUGS: Record<string, string> = {
  bonfire: "bonfire",
  vault: "vault",
  forge: "forge",
  observatory: "observatory",
  immolated: "hall",
  tavern: "ashencup",
  exchange: "grandexchange",
  market: "blackmarket",
  gate: "gate",
};
const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(BUILDING_SLUGS).map(([id, slug]) => [slug, id])
);

/** The building id named in the current URL path, or null at the map root. */
function buildingFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  let path = window.location.pathname;
  if (path.startsWith(KINGDOM_PATH)) path = path.slice(KINGDOM_PATH.length);
  const slug = path.replace(/^\/+|\/+$/g, "").split("/")[0];
  return slug ? SLUG_TO_ID[slug] ?? null : null;
}

interface NavigationValue {
  pending: NavTarget | null;
  navigate: (target: NavTarget) => void;
  clearPending: () => void;
  /** Reflect the open building in the URL with pushState (no reload). null = map. */
  syncUrl: (buildingId: string | null) => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<NavTarget | null>(null);

  const navigate = useCallback((target: NavTarget) => setPending(target), []);
  const clearPending = useCallback(() => setPending(null), []);

  const syncUrl = useCallback((buildingId: string | null) => {
    if (typeof window === "undefined") return;
    const slug = buildingId ? BUILDING_SLUGS[buildingId] : null;
    const target = `${KINGDOM_PATH}${slug ? `/${slug}` : ""}`;
    if (window.location.pathname !== target) {
      window.history.pushState(null, "", target + window.location.search + window.location.hash);
    }
  }, []);

  // Deep-link on first load, and react to browser Back/Forward: open the
  // building named in the URL ("" = the map, when Back returns to /kingdom).
  useEffect(() => {
    const id = buildingFromLocation();
    if (id) setPending({ building: id });
    const onPop = () => setPending({ building: buildingFromLocation() ?? "" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = useMemo(
    () => ({ pending, navigate, clearPending, syncUrl }),
    [pending, navigate, clearPending, syncUrl]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within <NavigationProvider>");
  return ctx;
}
