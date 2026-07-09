"use client";

/* Slippage + deadline controls (the gear menu). Mirrors Uniswap's swap
   settings: Auto vs Custom max-slippage, and a transaction deadline. Values
   persist via useSwapSettings (localStorage). */

import type { SwapSettings } from "@/lib/types";
import { SegmentedControl } from "@/components/ui/primitives";

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
    <div className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-frame/60 bg-surface shadow-panel p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-base text-text">Settings</span>
        <button onClick={onClose} aria-label="Close settings" className="text-text-3 hover:text-brand text-sm">
          ✕
        </button>
      </div>

      {/* Max slippage */}
      <div className="space-y-1.5">
        <span className="text-text-3 text-xs uppercase tracking-wider">Max slippage</span>
        <div className="flex items-center gap-2">
          <SegmentedControl<SwapSettings["slippageMode"]>
            ariaLabel="Slippage mode"
            value={settings.slippageMode}
            onChange={setSlippageMode}
            options={[
              { value: "auto", label: "Auto" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <div className="forged-field flex flex-1 items-center gap-1 px-2.5 py-1.5">
            <input
              inputMode="decimal"
              value={settings.slippageMode === "custom" ? customPct : "0.5"}
              disabled={settings.slippageMode === "auto"}
              onChange={(e) => {
                const n = Number(e.target.value);
                // Ignore non-numeric input so slippage never becomes NaN (which would
                // silently poison minReceived/maxSold and leave Review enabled).
                if (Number.isFinite(n) && n >= 0) setCustomSlippageBps(Math.round(n * 100));
              }}
              className="tabular w-full bg-transparent text-right outline-none text-text disabled:text-text-3"
            />
            <span className="text-brand-soft/80 text-sm">%</span>
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
        <div className="forged-field flex items-center gap-1 px-2.5 py-1.5">
          <input
            inputMode="numeric"
            value={settings.deadlineMinutes.toString()}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setDeadlineMinutes(Math.max(1, Math.round(n)));
            }}
            className="tabular w-full bg-transparent outline-none text-text"
          />
          <span className="text-text-3 text-sm shrink-0">minutes</span>
        </div>
      </div>
    </div>
  );
}
