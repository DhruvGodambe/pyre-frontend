"use client";

/* The trade-details accordion under the swap form, every number Uniswap shows:
   exchange rate (invertible), price impact, max slippage, minimum received /
   maximum sold, the honest fee breakdown, network cost, and the order route. */

import { useState } from "react";
import type { SwapQuote } from "@/lib/types";
import { formatPercent, formatUsd } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { fmtTokenAmount } from "./token-row";

function Row({
  label,
  children,
  onLabelClick,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onLabelClick?: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <button
        type="button"
        onClick={onLabelClick}
        disabled={!onLabelClick}
        className={`text-text-2 ${onLabelClick ? "underline decoration-dotted underline-offset-2" : ""}`}
      >
        {label}
      </button>
      <span className={`tabular text-right ${danger ? "text-danger" : "text-text"}`}>{children}</span>
    </div>
  );
}

export function SwapDetails({
  quote,
  slippageLabel,
  onOpenSettings,
}: {
  quote: SwapQuote;
  slippageLabel: string; // e.g. "Auto · 0.5%" or "1%"
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [inverted, setInverted] = useState(false);

  const inSym = quote.input.token.symbol;
  const outSym = quote.output.token.symbol;
  // executionPrice = output per input.
  const rate = quote.executionPrice;
  const rateText = inverted
    ? `1 ${outSym} = ${(1 / rate).toLocaleString("en-US", { maximumSignificantDigits: 6 })} ${inSym}`
    : `1 ${inSym} = ${rate.toLocaleString("en-US", { maximumSignificantDigits: 6 })} ${outSym}`;

  const impactDanger = quote.priceImpact >= 0.05;
  const hop = quote.route[0];

  return (
    <div className="rounded-md bg-surface-2 border border-surface-3">
      {/* Always-visible summary line: rate + expand toggle */}
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => setInverted((v) => !v)}
          className="tabular text-text-2 hover:text-text"
          title="Invert rate"
        >
          {rateText}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-text-3 hover:text-text"
          aria-expanded={open}
        >
          {open ? "Hide details ▴" : "Details ▾"}
        </button>
      </div>

      {open && (
        <div className="border-t border-surface-3 px-3 py-2">
          <Row label="Price impact" danger={impactDanger}>
            {formatPercent(quote.priceImpact, 2)}
          </Row>
          <Row label="Max slippage" onLabelClick={onOpenSettings}>
            {slippageLabel}
          </Row>
          {quote.kind === "exactIn" ? (
            <Row label="Minimum received">
              {fmtTokenAmount(quote.output.token, quote.minReceived)} {outSym}
            </Row>
          ) : (
            <Row label="Maximum sold">
              {fmtTokenAmount(quote.input.token, quote.maxSold)} {inSym}
            </Row>
          )}

          {/* Fee breakdown, honest disposition */}
          <Row label={`Fee (${formatPercent(quote.fee.totalFeeBps / 10000, 2)})`}>
            {fmtTokenAmount(quote.input.token, quote.fee.feeAmount)} {inSym}
          </Row>
          <div className="pl-3 border-l border-surface-3 ml-1 my-1 space-y-0.5">
            <Row label="Liquidity provider">{formatPercent(quote.fee.lpFeeBps / 10000, 2)}</Row>
            <Row label="Protocol (hook)">{formatPercent(quote.fee.hookFeeBps / 10000, 2)}</Row>
            {quote.fee.launchFeeBps > 0 && (
              <Row label="Launch fee (decaying)">{formatPercent(quote.fee.launchFeeBps / 10000, 2)}</Row>
            )}
            <div className="flex justify-end pt-0.5">
              <Badge tone={quote.direction === "sell" ? "danger" : "success"}>
                {quote.fee.disposition}
              </Badge>
            </div>
          </div>

          <Row label="Network cost">
            {formatUsd(quote.gasUsd)}
          </Row>

          {/* Order routing */}
          <div className="mt-2 border-t border-surface-3 pt-2">
            <span className="text-text-3 text-[10px] uppercase tracking-wider">Order routing</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-2">
              <span className="tabular">{hop.tokenIn}</span>
              <span className="text-text-3">→</span>
              <Badge tone="neutral">v4 · {formatPercent(hop.feeTier / 10000, 2)}</Badge>
              {hop.hook && <Badge tone="brand">Diamond hook</Badge>}
              <span className="text-text-3">→</span>
              <span className="tabular">{hop.tokenOut}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
