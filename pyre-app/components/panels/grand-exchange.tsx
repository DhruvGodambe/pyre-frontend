"use client";

/* THE GRAND EXCHANGE — buy & sell $PYRE. Spec: 05-ui-screens.md.
   Honest fee display: sell-side burned, buy-side to reward pool.
   States: not-connected, quoting, tx pending/confirmed/failed. */

import { useState } from "react";
import { useSwapQuote, useSwap } from "@/lib/hooks";
import { Panel, Stat, Field, Badge } from "@/components/ui/primitives";
import { TxButton } from "@/components/ui/tx-button";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { formatToken, formatEth, formatPercent, parseToken } from "@/lib/format";
import type { SwapDirection } from "@/lib/types";

export function GrandExchangePanel() {
  const [direction, setDirection] = useState<SwapDirection>("buy");
  const [amount, setAmount] = useState("");
  const amountIn = parseToken(amount);
  const quote = useSwapQuote(direction, amountIn);
  const swap = useSwap();

  const inSuffix = direction === "buy" ? "ETH" : "$PYRE";
  const outSuffix = direction === "buy" ? "$PYRE" : "ETH";

  return (
    <Panel title="The Grand Exchange" tagline="Buy & sell $PYRE">
      <RequireWallet message="Connect to swap.">
        <div className="space-y-4">
          <div className="flex gap-1 rounded-md bg-surface-2 p-1 text-sm">
            {(["buy", "sell"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 rounded-sm py-1.5 capitalize ${
                  direction === d ? "bg-brand text-bg" : "text-text-2"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <Field label="You pay" value={amount} onChange={setAmount} suffix={inSuffix} />

          <div className="rounded-md bg-surface-2 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-3 text-xs uppercase tracking-wider">You receive</span>
              <span className="tabular text-lg text-text">
                {quote.data
                  ? direction === "buy"
                    ? formatToken(quote.data.amountOut)
                    : formatEth(quote.data.amountOut)
                  : "-"}{" "}
                {outSuffix}
              </span>
            </div>
            {quote.data && (
              <>
                <div className="flex items-center justify-between text-xs text-text-2">
                  <span>Price impact</span>
                  <span className="tabular">{formatPercent(quote.data.priceImpact, 3)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-2">Fee {formatPercent(quote.data.feeBps / 10000)}</span>
                  <Badge tone={direction === "sell" ? "danger" : "success"}>
                    {quote.data.feeDisposition}
                  </Badge>
                </div>
              </>
            )}
          </div>

          <TxButton
            tx={swap}
            disabled={amountIn <= 0n || !quote.data}
            onClick={() => swap.mutate({ direction, amountIn })}
            pendingLabel="Swapping…"
          >
            {direction === "buy" ? "Buy $PYRE" : "Sell $PYRE"}
          </TxButton>

          <p className="text-text-3 text-xs text-center">
            Sell fees are burned permanently · buy fees flow to the reward pool
          </p>
        </div>
      </RequireWallet>
    </Panel>
  );
}
