"use client";

/* Slippage + deadline controls (the gear menu). Mirrors Uniswap's swap
   settings: Auto vs Custom max-slippage, and a transaction deadline. Values
   persist via useSwapSettings (localStorage). */

import type { SwapSettings } from "@/lib/types";

export function SettingsPopover({
  settings,
  setSlippageMode,
  setCustomSlippageBps,
  setDeadlineMinutes,
  onClose,
}: {
  settings: SwapSettings;
  setSlippageMode: (m: SwapSettings["slippageMode"]) => void;
  setCustomSlippageBps: (bps: number) => void;
  setDeadlineMinutes: (m: number) => void;
  onClose: () => void;
}) {
  const customPct = (settings.slippageBps / 100).toString();
  const highSlippage = settings.slippageMode === "custom" && settings.slippageBps > 500;
  const lowSlippage = settings.slippageMode === "custom" && settings.slippageBps < 10;

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-surface-3 bg-surface shadow-panel p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">Settings</span>
        <button onClick={onClose} className="text-text-3 hover:text-text text-sm">
          ✕
        </button>
      </div>

      {/* Max slippage */}
      <div className="space-y-1.5">
        <span className="text-text-3 text-xs uppercase tracking-wider">Max slippage</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-surface-2 p-0.5 text-xs">
            {(["auto", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSlippageMode(m)}
                className={`rounded-sm px-2.5 py-1 capitalize ${
                  settings.slippageMode === m ? "bg-brand text-bg" : "text-text-2"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-1 rounded-md bg-surface-2 border border-surface-3 px-2 py-1.5">
            <input
              inputMode="decimal"
              value={settings.slippageMode === "custom" ? customPct : "0.5"}
              disabled={settings.slippageMode === "auto"}
              onChange={(e) => setCustomSlippageBps(Math.round(Number(e.target.value || 0) * 100))}
              className="tabular w-full bg-transparent text-right outline-none text-text disabled:text-text-3"
            />
            <span className="text-text-3 text-sm">%</span>
          </div>
        </div>
        {highSlippage && (
          <p className="text-warning text-xs">High slippage, your trade may be front-run.</p>
        )}
        {lowSlippage && (
          <p className="text-warning text-xs">Very low slippage, your trade may fail.</p>
        )}
      </div>

      {/* Deadline */}
      <div className="space-y-1.5">
        <span className="text-text-3 text-xs uppercase tracking-wider">Transaction deadline</span>
        <div className="flex items-center gap-1 rounded-md bg-surface-2 border border-surface-3 px-2 py-1.5">
          <input
            inputMode="numeric"
            value={settings.deadlineMinutes.toString()}
            onChange={(e) => setDeadlineMinutes(Math.max(1, Math.round(Number(e.target.value || 0))))}
            className="tabular w-full bg-transparent outline-none text-text"
          />
          <span className="text-text-3 text-sm shrink-0">minutes</span>
        </div>
      </div>
    </div>
  );
}
