"use client";

/* One side of the swap (pay / receive). Styled like a Uniswap token row:
   big amount input, token chip, USD value underneath, and (pay side) the
   wallet balance with Max / 50% shortcuts. Both rows are editable, typing in
   "receive" flips the quote to exact-output, exactly like Uniswap. */

import type { TokenInfo } from "@/lib/types";
import { formatToken, formatEth, formatUsd } from "@/lib/format";

/** Amount string for a token (ETH gets more precision; PYRE compacts when big). */
export function fmtTokenAmount(token: TokenInfo, amount: bigint): string {
  if (amount === 0n) return "0";
  return token.isNative
    ? formatEth(amount, 6).replace(" ETH", "")
    : formatToken(amount, { maxFrac: 2, compact: false });
}

function TokenChip({ token }: { token: TokenInfo }) {
  const isPyre = token.symbol === "PYRE";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 pl-1 pr-2.5 py-1">
      <span
        className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
          isPyre ? "bg-brand text-bg" : "bg-surface text-text"
        }`}
        aria-hidden
      >
        {isPyre ? "🜂" : "Ξ"}
      </span>
      <span className="text-sm font-medium text-text">{token.symbol}</span>
    </span>
  );
}

export function TokenRow({
  label,
  token,
  valueText,
  onChange,
  onFocus,
  usd,
  balance,
  onMax,
  onHalf,
  loading,
  insufficient,
}: {
  label: string;
  token: TokenInfo;
  valueText: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  usd?: number;
  balance?: bigint; // pay side only
  onMax?: () => void;
  onHalf?: () => void;
  loading?: boolean;
  insufficient?: boolean;
}) {
  return (
    <div className="rounded-md bg-surface-2 border border-surface-3 px-3 py-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-3 uppercase tracking-wider">{label}</span>
        {balance !== undefined && (
          <div className="flex items-center gap-2">
            <span className={insufficient ? "text-danger" : "text-text-3"}>
              Balance {fmtTokenAmount(token, balance)}
            </span>
            {onHalf && (
              <button onClick={onHalf} className="text-brand hover:underline">
                50%
              </button>
            )}
            {onMax && (
              <button onClick={onMax} className="text-brand hover:underline">
                Max
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          inputMode="decimal"
          placeholder="0.0"
          value={valueText}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={`tabular flex-1 bg-transparent outline-none text-3xl min-w-0 ${
            loading ? "text-text-3 animate-pulse" : "text-text"
          }`}
        />
        <TokenChip token={token} />
      </div>

      <div className="mt-1 h-4 text-xs text-text-3 tabular">
        {usd !== undefined && usd > 0 ? formatUsd(usd) : ""}
      </div>
    </div>
  );
}
