"use client";

/* ============================================================================
   PYRE, Swap settings (slippage + deadline), persisted like Uniswap
   ----------------------------------------------------------------------------
   The Grand Exchange remembers the user's max-slippage and transaction-deadline
   choices across reloads (localStorage). `effectiveSlippageBps` resolves the
   Auto vs Custom choice into the single number the quote/swap actually uses.
   No new deps, a tiny localStorage-backed hook.
   ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import type { SwapSettings } from "./types";

const STORAGE_KEY = "pyre.swap.settings";

/** Auto slippage for our pool. Tunable; Uniswap uses a dynamic value, we keep
    a sane fixed default (0.5%). */
export const AUTO_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_MINUTES = 30;

const DEFAULTS: SwapSettings = {
  slippageMode: "auto",
  slippageBps: AUTO_SLIPPAGE_BPS,
  deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
};

function load(): SwapSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SwapSettings>) };
  } catch {
    return DEFAULTS;
  }
}

/** The actual slippage (bps) the quote/swap should use, after resolving Auto. */
export function effectiveSlippageBps(s: SwapSettings): number {
  return s.slippageMode === "auto" ? AUTO_SLIPPAGE_BPS : Math.max(0, s.slippageBps);
}

export function useSwapSettings() {
  const [settings, setSettings] = useState<SwapSettings>(DEFAULTS);

  // Hydrate from storage after mount (avoids SSR mismatch).
  useEffect(() => setSettings(load()), []);

  const update = useCallback((patch: Partial<SwapSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable, keep in-memory */
      }
      return next;
    });
  }, []);

  return {
    settings,
    effectiveSlippageBps: effectiveSlippageBps(settings),
    setSlippageMode: (slippageMode: SwapSettings["slippageMode"]) =>
      update({ slippageMode }),
    setCustomSlippageBps: (slippageBps: number) =>
      update({ slippageMode: "custom", slippageBps }),
    setDeadlineMinutes: (deadlineMinutes: number) => update({ deadlineMinutes }),
  };
}
