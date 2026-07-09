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
import { Panel, Button, SegmentedControl } from "@/components/ui/primitives";
import { ImageArt } from "@/components/ui/image-button";
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

/* The refresh glyph (no bespoke art for it); stroke = currentColor so it
   inherits the button's text color + hover. The direction flip and settings
   gear now use the designer's ornate swap_icon / settings art instead. */
function IconRefresh({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

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
      frame="forged"
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
            <SegmentedControl<SwapDirection>
              ariaLabel="Buy or sell $PYRE"
              value={direction}
              onChange={(d) => {
                setDirection(d);
                setKind("exactIn");
              }}
              options={[
                { value: "buy", label: "Buy" },
                { value: "sell", label: "Sell" },
              ]}
            />
            <div className="relative flex items-center gap-1.5">
              <button
                onClick={() => quote.refetch()}
                title="Refresh price"
                aria-label="Refresh price"
                className="grid h-8 w-8 place-items-center rounded-md text-text-3 hover:text-brand hover:bg-surface-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
              >
                <IconRefresh className={quote.isFetching ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Settings"
                aria-label="Swap settings"
                className="grid h-8 w-8 place-items-center rounded-md transition-transform hover:scale-110 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
              >
                <ImageArt name="settings" width={20} hover={showSettings} />
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
                aria-label="Switch direction"
                className="group absolute -my-3 grid h-10 w-10 place-items-center rounded-full bg-bg ring-1 ring-frame/50 transition-transform duration-base ease-warm hover:scale-110 hover:ring-brand/60 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <ImageArt
                  name="swapicon"
                  width={32}
                  className="transition-transform duration-base ease-warm group-hover:rotate-180"
                />
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
    <div className="space-y-2 pt-1">
      <hr className="ember-hairline" />
      <span className="eyebrow">Recent swaps</span>
      <ul className="forged-card divide-y divide-surface-3/50 overflow-hidden">
        {swaps.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-text-2">
            <span className="tabular shrink-0">{shortAddress(s.address)}</span>
            <span className="truncate">{s.note}</span>
            <span className="text-text-3 shrink-0">{formatAgo(s.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
