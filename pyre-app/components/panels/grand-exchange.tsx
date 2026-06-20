"use client";

/* THE GRAND EXCHANGE, the full Uniswap-v4 swap experience for PYRE↔ETH.
   Spec: 05-ui-screens.md. Drives the same data a real Uniswap swap shows
   (rate, price impact, slippage floor, fee breakdown, route, gas, Permit2
   approval) through the DataSource seam, so it runs on the mock today and on
   the deployed v4 pool + Diamond hook when the dev flips USE_MOCK. Mobile-first. */

import { useMemo, useState } from "react";
import {
  useSwapQuote,
  usePoolState,
  useSwapBalances,
  useApprovalState,
  useApproveToken,
  useSwap,
  useActivityFeed,
} from "@/lib/hooks";
import { useSwapSettings } from "@/lib/swap-settings";
import { Panel, Button } from "@/components/ui/primitives";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { TokenRow, fmtTokenAmount } from "./grand-exchange/token-row";
import { SwapDetails } from "./grand-exchange/swap-details";
import { SettingsPopover } from "./grand-exchange/settings-popover";
import { ReviewSwap } from "./grand-exchange/review-swap";
import { TOKENS } from "@/lib/config";
import { parseToken, toNumber, formatUsd, formatAgo, shortAddress } from "@/lib/format";
import type { SwapDirection, SwapKind } from "@/lib/types";
import type { SwapParams } from "@/lib/datasource";

const ETH_GAS_RESERVE = 0.01; // leave a little ETH for gas on "Max" (buy side)

export function GrandExchangePanel() {
  const [direction, setDirection] = useState<SwapDirection>("buy");
  const [kind, setKind] = useState<SwapKind>("exactIn");
  const [typed, setTyped] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const payToken = direction === "buy" ? TOKENS.eth : TOKENS.pyre;
  const receiveToken = direction === "buy" ? TOKENS.pyre : TOKENS.eth;

  const settings = useSwapSettings();
  const slippageBps = settings.effectiveSlippageBps;
  const slippageLabel =
    settings.settings.slippageMode === "auto"
      ? `Auto · ${(slippageBps / 100).toFixed(2)}%`
      : `${(slippageBps / 100).toFixed(2)}%`;

  const amount = parseToken(typed);
  const quote = useSwapQuote({ direction, kind, amount, slippageBps });
  const pool = usePoolState();
  const balances = useSwapBalances();

  // The amount actually paid (input side), for balance + approval checks.
  const payAmount =
    kind === "exactIn" ? amount : quote.data?.input.amount ?? 0n;
  const approval = useApprovalState(direction, payAmount);
  const approveTx = useApproveToken();
  const swapTx = useSwap();

  const payBalance = direction === "buy" ? balances.data?.eth : balances.data?.pyre;
  const insufficient =
    payBalance !== undefined && payAmount > 0n && payAmount > payBalance;

  // Row display values: the typed side shows raw text; the other shows the quote.
  const payText =
    kind === "exactIn"
      ? typed
      : quote.data
      ? fmtTokenAmount(payToken, quote.data.input.amount)
      : "";
  const receiveText =
    kind === "exactOut"
      ? typed
      : quote.data
      ? fmtTokenAmount(receiveToken, quote.data.output.amount)
      : "";

  function editPay(v: string) {
    setKind("exactIn");
    setTyped(v);
  }
  function editReceive(v: string) {
    setKind("exactOut");
    setTyped(v);
  }

  function setPayFraction(fraction: number) {
    if (payBalance === undefined) return;
    let human = toNumber(payBalance) * fraction;
    if (payToken.isNative) human = Math.max(0, human - ETH_GAS_RESERVE);
    setKind("exactIn");
    setTyped(human ? String(Number(human.toFixed(6))) : "");
  }

  function flip() {
    const nextOut = quote.data ? String(Number(toNumber(quote.data.output.amount).toFixed(6))) : "";
    setDirection((d) => (d === "buy" ? "sell" : "buy"));
    setKind("exactIn");
    setTyped(nextOut);
  }

  const params: SwapParams | null = quote.data
    ? {
        direction,
        kind,
        amount,
        slippageBps,
        limitAmount: kind === "exactIn" ? quote.data.minReceived : quote.data.maxSold,
        deadlineMinutes: settings.settings.deadlineMinutes,
      }
    : null;

  function closeReview() {
    setShowReview(false);
    if (swapTx.isSuccess) {
      swapTx.reset();
      setTyped("");
    }
  }

  // ---- primary action state machine -------------------------------------
  const cta = useMemo(() => {
    if (amount <= 0n) return { label: "Enter an amount", disabled: true } as const;
    if (quote.isLoading && !quote.data)
      return { label: "Fetching best price…", disabled: true } as const;
    if (!quote.data) return { label: "Enter an amount", disabled: true } as const;
    if (quote.data.warning?.kind === "insufficientLiquidity")
      return { label: "Insufficient liquidity", disabled: true } as const;
    if (insufficient)
      return { label: `Insufficient ${payToken.symbol}`, disabled: true } as const;
    if (approval.data?.status === "needs-approval")
      return { label: `Approve ${payToken.symbol}`, action: "approve" } as const;
    if (approval.data?.status === "needs-permit")
      return { label: "Sign permit", action: "approve" } as const;
    const danger = quote.data.priceImpact >= 0.05;
    return { label: danger ? "Review (high impact)" : "Review", action: "review", danger } as const;
  }, [amount, quote.isLoading, quote.data, insufficient, payToken.symbol, approval.data?.status]);

  function onCta() {
    if ("action" in cta && cta.action === "approve") approveTx.mutate();
    else if ("action" in cta && cta.action === "review") setShowReview(true);
  }

  return (
    <Panel
      title="The Grand Exchange"
      tagline="Buy & sell $PYRE"
      action={
        pool.data && (
          <div className="text-right text-xs text-text-3 tabular">
            <div>1 PYRE ≈ {formatUsd(pool.data.pricePyreUsd, 4)}</div>
            <div>TVL {formatUsd(pool.data.tvlUsd)}</div>
          </div>
        )
      }
    >
      <RequireWallet message="Connect to swap.">
        <div id="exchange-swap" className="space-y-3 scroll-mt-24">
          {/* Direction + tools */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-md bg-surface-2 p-1 text-sm">
              {(["buy", "sell"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDirection(d);
                    setKind("exactIn");
                  }}
                  className={`rounded-sm px-4 py-1.5 capitalize ${
                    direction === d ? "bg-brand text-bg" : "text-text-2"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => quote.refetch()}
                title="Refresh price"
                className={`grid h-8 w-8 place-items-center rounded-md text-text-3 hover:text-text ${
                  quote.isFetching ? "animate-spin" : ""
                }`}
              >
                ↻
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Settings"
                className="grid h-8 w-8 place-items-center rounded-md text-text-3 hover:text-text"
              >
                ⚙
              </button>
              {showSettings && (
                <SettingsPopover
                  settings={settings.settings}
                  setSlippageMode={settings.setSlippageMode}
                  setCustomSlippageBps={settings.setCustomSlippageBps}
                  setDeadlineMinutes={settings.setDeadlineMinutes}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          </div>

          {/* Pay row + flip + receive row */}
          <div className="relative space-y-1">
            <TokenRow
              label="You pay"
              token={payToken}
              valueText={payText}
              onChange={editPay}
              onFocus={() => setKind("exactIn")}
              usd={quote.data?.input.usd}
              balance={payBalance}
              onMax={() => setPayFraction(1)}
              onHalf={() => setPayFraction(0.5)}
              loading={kind === "exactOut" && quote.isFetching}
              insufficient={insufficient}
            />
            <div className="flex justify-center">
              <button
                onClick={flip}
                title="Switch direction"
                className="absolute -my-3 grid h-8 w-8 place-items-center rounded-md border border-surface-3 bg-surface text-text-2 hover:text-brand"
              >
                ⇅
              </button>
            </div>
            <TokenRow
              label="You receive"
              token={receiveToken}
              valueText={receiveText}
              onChange={editReceive}
              onFocus={() => setKind("exactOut")}
              usd={quote.data?.output.usd}
              loading={kind === "exactIn" && quote.isFetching}
            />
          </div>

          {/* Trade details */}
          {quote.data && (
            <SwapDetails
              quote={quote.data}
              slippageLabel={slippageLabel}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {/* Primary action */}
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={onCta}
              disabled={("disabled" in cta && cta.disabled) || approveTx.isPending}
              variant={"danger" in cta && cta.danger ? "danger" : "primary"}
              className="w-full"
            >
              {approveTx.isPending
                ? approval.data?.status === "needs-permit"
                  ? "Signing…"
                  : "Approving…"
                : cta.label}
            </Button>
            {approveTx.isError && (
              <p className="text-danger text-xs">{approveTx.error?.message}</p>
            )}
          </div>

          <p className="text-text-3 text-xs text-center">
            Sell fees are burned permanently · buy fees flow to the reward pool
          </p>

          <RecentSwaps />
        </div>
      </RequireWallet>

      {showReview && quote.data && params && (
        <ReviewSwap
          quote={quote.data}
          slippageLabel={slippageLabel}
          swap={swapTx}
          onConfirm={() => swapTx.mutate(params)}
          onClose={closeReview}
        />
      )}
    </Panel>
  );
}

/* Recent swaps, reuses the global activity feed, filtered to swaps. */
function RecentSwaps() {
  const feed = useActivityFeed();
  const swaps = (feed.data ?? []).filter((e) => e.kind === "swap").slice(0, 5);
  if (swaps.length === 0) return null;
  return (
    <div className="border-t border-surface-3 pt-3">
      <span className="text-text-3 text-[10px] uppercase tracking-wider">Recent swaps</span>
      <ul className="mt-1 space-y-1">
        {swaps.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-xs text-text-2">
            <span className="tabular">{shortAddress(s.address)}</span>
            <span>{s.note}</span>
            <span className="text-text-3">{formatAgo(s.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
