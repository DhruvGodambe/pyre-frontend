"use client";

/* Uniswap-style "Review swap" confirmation sheet. Final amounts, the slippage
   floor, fee and price-impact warning, then a single Confirm that runs the
   swap and shows pending → confirmed (with tx hash) → failed. Mobile-first:
   a bottom sheet on phones, a centered card on desktop. */

import type { SwapQuote } from "@/lib/types";
import { formatUsd, formatPercent, shortAddress } from "@/lib/format";
import { Button } from "@/components/ui/primitives";
import { useNavigation } from "@/lib/navigation";
import { fmtTokenAmount } from "./token-row";

interface SwapTx {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data?: { ok: boolean; hash?: string };
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-text-2">{label}</span>
      <span className="tabular text-text">{value}</span>
    </div>
  );
}

export function ReviewSwap({
  quote,
  slippageLabel,
  swap,
  onConfirm,
  onClose,
}: {
  quote: SwapQuote;
  slippageLabel: string;
  swap: SwapTx;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { navigate } = useNavigation();
  const inSym = quote.input.token.symbol;
  const outSym = quote.output.token.symbol;
  const confirmed = swap.isSuccess && swap.data?.ok;
  const impactDanger = quote.priceImpact >= 0.05;
  const boughtPyre = outSym === "PYRE"; // a buy, the next step is to put it to work

  const goStake = () => {
    onClose();
    navigate({ building: "forge", tab: "stake" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={() => !swap.isPending && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-panel sm:rounded-panel bg-surface border border-surface-3 shadow-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-text">
            {confirmed ? "Swap submitted" : "Review swap"}
          </h3>
          {!swap.isPending && (
            <button onClick={onClose} className="text-text-3 hover:text-text">
              ✕
            </button>
          )}
        </header>

        {/* Amounts */}
        <div className="space-y-2">
          <div className="rounded-md bg-surface-2 px-3 py-3">
            <span className="text-text-3 text-xs uppercase tracking-wider">You pay</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="tabular text-2xl text-text">
                {fmtTokenAmount(quote.input.token, quote.input.amount)} {inSym}
              </span>
              <span className="text-text-3 text-xs">{formatUsd(quote.input.usd)}</span>
            </div>
          </div>
          <div className="rounded-md bg-surface-2 px-3 py-3">
            <span className="text-text-3 text-xs uppercase tracking-wider">You receive</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="tabular text-2xl text-text">
                {fmtTokenAmount(quote.output.token, quote.output.amount)} {outSym}
              </span>
              <span className="text-text-3 text-xs">{formatUsd(quote.output.usd)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-3 border-t border-surface-3 pt-2">
          <Line
            label={quote.kind === "exactIn" ? "Minimum received" : "Maximum sold"}
            value={
              quote.kind === "exactIn"
                ? `${fmtTokenAmount(quote.output.token, quote.minReceived)} ${outSym}`
                : `${fmtTokenAmount(quote.input.token, quote.maxSold)} ${inSym}`
            }
          />
          <Line label="Max slippage" value={slippageLabel} />
          <Line
            label="Price impact"
            value={
              <span className={impactDanger ? "text-danger" : ""}>
                {formatPercent(quote.priceImpact, 2)}
              </span>
            }
          />
          <Line
            label={`Fee (${formatPercent(quote.fee.totalFeeBps / 10000, 2)})`}
            value={`${fmtTokenAmount(quote.input.token, quote.fee.feeAmount)} ${inSym} · ${quote.fee.disposition}`}
          />
          <Line label="Network cost" value={formatUsd(quote.gasUsd)} />
        </div>

        {impactDanger && !confirmed && (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            High price impact ({formatPercent(quote.priceImpact, 1)}). You may lose a significant
            amount to slippage.
          </p>
        )}

        {/* Action / status */}
        <div className="mt-4">
          {confirmed ? (
            <div className="space-y-2 text-center">
              <p className="text-success text-sm">The fire accepts your offering.</p>
              {swap.data?.hash && (
                <p className="text-text-3 text-xs tabular">
                  tx {shortAddress(swap.data.hash)}
                </p>
              )}
              {boughtPyre ? (
                <>
                  <p className="text-text-2 text-xs">
                    Now stake your $PYRE to earn $ETH yield, then burn to forge an Acolyte and
                    multiply it.
                  </p>
                  <Button onClick={goStake} className="w-full">
                    Stake it to start earning $ETH
                  </Button>
                  <Button onClick={onClose} variant="ghost" className="w-full">
                    Done
                  </Button>
                </>
              ) : (
                <Button onClick={onClose} className="w-full">
                  Done
                </Button>
              )}
            </div>
          ) : (
            <>
              <Button
                onClick={onConfirm}
                disabled={swap.isPending}
                variant={impactDanger ? "danger" : "primary"}
                className="w-full"
              >
                {swap.isPending ? "Swapping…" : impactDanger ? "Swap anyway" : "Confirm swap"}
              </Button>
              {swap.isError && (
                <p className="mt-2 text-danger text-xs">
                  {swap.error?.message ?? "Transaction failed"}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
