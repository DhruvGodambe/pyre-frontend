/* ============================================================================
   PYRE, Display formatting
   ----------------------------------------------------------------------------
   Turns on-chain bigints + raw values into the strings the UI shows. Centralised
   so number formatting is consistent everywhere (and easy to restyle).
   ========================================================================== */

import { DECIMALS } from "./constants";

/** bigint base units → number (loses precision; for display/charts only). */
export function toNumber(value: bigint, decimals = DECIMALS): number {
  return Number(value) / 10 ** decimals;
}

/** Compact token amount, e.g. 1_284_500 → "1.28M".
 *  Small nonzero balances keep enough fraction digits so 0.001 doesn't
 *  round to "0" (default maxFrac is 2). */
export function formatToken(
  value: bigint,
  opts: { decimals?: number; maxFrac?: number; compact?: boolean } = {}
): string {
  const { decimals = DECIMALS, maxFrac = 2, compact = true } = opts;
  const n = toNumber(value, decimals);
  let frac = maxFrac;
  if (value > 0n && n > 0 && n < 10 ** -maxFrac) {
    // Keep up to 6 dp so dust stakes remain visible; never round a positive
    // balance all the way to zero.
    frac = Math.min(6, Math.max(maxFrac, Math.ceil(-Math.log10(n))));
  }
  return new Intl.NumberFormat("en-US", {
    notation: compact && n >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: frac,
  }).format(n);
}

/** ETH amount (18 decimals) → "0.318 $ETH". (Brand style: ETH is shown as $ETH.)
 *  Tiny nonzero amounts keep extra fraction digits so dust pairs don't show as "0". */
export function formatEth(value: bigint, maxFrac = 4): string {
  const n = toNumber(value);
  let frac = maxFrac;
  if (value > 0n && n > 0 && n < 10 ** -maxFrac) {
    frac = Math.min(12, Math.max(maxFrac, Math.ceil(-Math.log10(n))));
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: frac }).format(n)} $ETH`;
}

/** 12.5 → "$12.50"; 1_284_500 → "$1.28M". Small values keep cents. */
export function formatUsd(value: number, maxFrac = 2): string {
  const compact = Math.abs(value) >= 100_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : maxFrac,
  }).format(value);
}

/** 0.0045 → "0.45%". Tiny nonzero ratios keep extra digits so dust stakes
 *  don't display as "0%" (e.g. 0.002 / 10M ≈ 0.00000002%). */
export function formatPercent(value: number, maxFrac = 2): string {
  const pct = value * 100;
  let frac = maxFrac;
  if (value > 0 && pct > 0 && pct < 10 ** -maxFrac) {
    frac = Math.min(8, Math.max(maxFrac, Math.ceil(-Math.log10(pct))));
  }
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: frac,
  }).format(pct)}%`;
}

/** 0x1234…abcd */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** ms-until → "00:42:17" (h:m:s) or "2d 4h" for long ranges. */
export function formatCountdown(msUntil: number): string {
  const s = Math.max(0, Math.floor(msUntil / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** "3m ago", "2h ago", for activity feeds. */
export function formatAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Live decay loss: how much a liquid balance loses over the next hour. */
export function decayPerHour(liquid: bigint, ratePerHour: number): bigint {
  return BigInt(Math.floor(Number(liquid) * ratePerHour));
}

/** bigint base units → an EXACT plain decimal string (no separators), for filling
 *  an input that parseToken will re-parse losslessly. Trims trailing zeros.
 *  Unlike formatToken this never compacts ("1.28M") or rounds. */
export function toAmountString(value: bigint, decimals = DECIMALS): string {
  if (value <= 0n) return "";
  const base = 10n ** BigInt(decimals);
  const whole = (value / base).toString();
  const frac = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** A whole-percent (0–100) slice of a base-unit balance, exact in bigint. */
export function percentOf(value: bigint, percent: number): bigint {
  return (value * BigInt(Math.round(percent))) / 100n;
}

/** User input string ("1,250.5") → on-chain bigint. Returns 0n if invalid. */
export function parseToken(input: string, decimals = DECIMALS): bigint {
  const clean = input.replace(/,/g, "").trim();
  if (!clean || isNaN(Number(clean))) return 0n;
  const [whole, frac = ""] = clean.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}
