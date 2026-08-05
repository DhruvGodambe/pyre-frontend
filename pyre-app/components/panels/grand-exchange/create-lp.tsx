"use client";

/* Create LP tab — mint a full-range Uniswap v4 position NFT in the Pyre pool.
   Calls PositionManager.modifyLiquidities (same path as CreateLpPosition.s.sol).
   Entering either side auto-fills the other from the live pool price. */

import { useMemo, useState } from "react";
import { useCreateLp, useSwapBalances, usePoolState } from "@/lib/hooks";
import { Button, Field } from "@/components/ui/primitives";
import { TOKENS } from "@/lib/config";
import {
  parseToken,
  toNumber,
  formatUsd,
  formatToken,
  formatEth,
  toAmountString,
} from "@/lib/format";

const ETH_GAS_RESERVE = 0.01;
const Q96 = 2n ** 96n;

type LastEdited = "eth" | "pyre";

/** Full-range pair at current price: PYRE = ETH × (√P)² / 2^192 */
function pyreForEth(eth: bigint, sqrtPriceX96: bigint): bigint {
  if (eth === 0n || sqrtPriceX96 === 0n) return 0n;
  return (eth * sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
}

/** Inverse: ETH = PYRE × 2^192 / (√P)² */
function ethForPyre(pyre: bigint, sqrtPriceX96: bigint): bigint {
  if (pyre === 0n || sqrtPriceX96 === 0n) return 0n;
  return (pyre * Q96 * Q96) / (sqrtPriceX96 * sqrtPriceX96);
}

/** Trim long decimal strings for the auto-filled field. */
function displayAmount(value: bigint, maxFrac: number): string {
  const raw = toAmountString(value);
  if (!raw.includes(".")) return raw;
  const [w, f = ""] = raw.split(".");
  const trimmed = f.slice(0, maxFrac).replace(/0+$/, "");
  return trimmed ? `${w}.${trimmed}` : w;
}

export function CreateLpPanel() {
  const [ethText, setEthText] = useState("");
  const [pyreText, setPyreText] = useState("");
  const [lastEdited, setLastEdited] = useState<LastEdited>("eth");
  const balances = useSwapBalances();
  const pool = usePoolState();
  const createLp = useCreateLp();

  const sqrtPriceX96 = pool.data?.sqrtPriceX96 ?? 0n;

  const ethAmount = parseToken(ethText);
  const pyreAmount = parseToken(pyreText);

  const ethBal = balances.data?.eth;
  const pyreBal = balances.data?.pyre;

  const insufficientEth =
    ethBal !== undefined && ethAmount > 0n && ethAmount > ethBal;
  const insufficientPyre =
    pyreBal !== undefined && pyreAmount > 0n && pyreAmount > pyreBal;

  const cta = useMemo(() => {
    if (!pool.data || sqrtPriceX96 === 0n)
      return { label: "Pool price unavailable", disabled: true } as const;
    if (ethAmount <= 0n || pyreAmount <= 0n)
      return { label: "Enter an amount", disabled: true } as const;
    if (insufficientEth) return { label: "Insufficient $ETH", disabled: true } as const;
    if (insufficientPyre) return { label: "Insufficient $PYRE", disabled: true } as const;
    return { label: "Create LP position", disabled: false } as const;
  }, [pool.data, sqrtPriceX96, ethAmount, pyreAmount, insufficientEth, insufficientPyre]);

  function onEthChange(v: string) {
    setLastEdited("eth");
    setEthText(v);
    const eth = parseToken(v);
    if (!v.trim() || eth === 0n || sqrtPriceX96 === 0n) {
      setPyreText("");
      return;
    }
    setPyreText(displayAmount(pyreForEth(eth, sqrtPriceX96), 4));
  }

  function onPyreChange(v: string) {
    setLastEdited("pyre");
    setPyreText(v);
    const pyre = parseToken(v);
    if (!v.trim() || pyre === 0n || sqrtPriceX96 === 0n) {
      setEthText("");
      return;
    }
    setEthText(displayAmount(ethForPyre(pyre, sqrtPriceX96), 6));
  }

  function setEthFraction(fraction: number) {
    if (ethBal === undefined) return;
    let human = toNumber(ethBal) * fraction;
    human = Math.max(0, human - ETH_GAS_RESERVE);
    onEthChange(human ? String(Number(human.toFixed(6))) : "");
  }

  function setPyreFraction(fraction: number) {
    if (pyreBal === undefined) return;
    const human = toNumber(pyreBal) * fraction;
    onPyreChange(human ? String(Number(human.toFixed(4))) : "");
  }

  function onCreate() {
    createLp.mutate(
      { ethAmount, pyreAmount, deadlineMinutes: 20 },
      {
        onSuccess: () => {
          setEthText("");
          setPyreText("");
        },
      }
    );
  }

  const ratioHint =
    pool.data && pool.data.pricePyreInEth > 0
      ? `1 $ETH ≈ ${formatToken(
          pyreForEth(10n ** 18n, sqrtPriceX96),
          { maxFrac: 2, compact: true }
        )} $PYRE at pool price`
      : null;

  return (
    <div id="exchange-lp" className="space-y-3 scroll-mt-24">
      <p className="text-text-2 text-xs leading-relaxed">
        Deposit $ETH + $PYRE into the Pyre Uniswap v4 pool as a full-range
        position NFT. Enter either side — the other fills from the live pool
        price. You can later lock that NFT forever via the Forge LP burn path.
      </p>

      {pool.data && (
        <div className="text-xs text-text-3 tabular flex justify-between gap-3">
          <span>1 PYRE ≈ {formatUsd(pool.data.pricePyreUsd, 4)}</span>
          <span>TVL {formatUsd(pool.data.tvlUsd)}</span>
        </div>
      )}

      <Field
        label="$ETH"
        value={ethText}
        onChange={onEthChange}
        placeholder="0.0"
        hint={
          ethBal !== undefined
            ? `Balance ${formatEth(ethBal)}${
                lastEdited === "pyre" ? " · paired from $PYRE" : ""
              }`
            : undefined
        }
        suffix={
          <span className="flex gap-1">
            <button
              type="button"
              className="text-[10px] text-brand hover:underline"
              onClick={() => setEthFraction(0.5)}
            >
              Half
            </button>
            <button
              type="button"
              className="text-[10px] text-brand hover:underline"
              onClick={() => setEthFraction(1)}
            >
              Max
            </button>
          </span>
        }
      />
      {insufficientEth && (
        <p className="text-danger text-xs">Not enough $ETH (leave some for gas).</p>
      )}

      <Field
        label="$PYRE"
        value={pyreText}
        onChange={onPyreChange}
        placeholder="0.0"
        hint={
          pyreBal !== undefined
            ? `Balance ${formatToken(pyreBal)}${
                lastEdited === "eth" ? " · paired from $ETH" : ""
              }`
            : undefined
        }
        suffix={
          <span className="flex gap-1">
            <button
              type="button"
              className="text-[10px] text-brand hover:underline"
              onClick={() => setPyreFraction(0.5)}
            >
              Half
            </button>
            <button
              type="button"
              className="text-[10px] text-brand hover:underline"
              onClick={() => setPyreFraction(1)}
            >
              Max
            </button>
          </span>
        }
      />
      {insufficientPyre && (
        <p className="text-danger text-xs">Not enough liquid $PYRE.</p>
      )}
      {ratioHint && <p className="text-text-3 text-[11px]">{ratioHint}</p>}

      <div className="orn-box space-y-1 text-xs text-text-3">
        <div className="flex justify-between">
          <span>Range</span>
          <span className="text-text-2">Full range</span>
        </div>
        <div className="flex justify-between">
          <span>Pool</span>
          <span className="text-text-2">
            {TOKENS.eth.symbol} / {TOKENS.pyre.symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Approvals</span>
          <span className="text-text-2">Permit2 → PositionManager</span>
        </div>
      </div>

      <Button
        onClick={onCreate}
        disabled={cta.disabled || createLp.isPending}
        className="w-full"
      >
        {createLp.isPending ? "Confirm in wallet…" : cta.label}
      </Button>

      {createLp.isSuccess && (
        <p className="text-xs text-text-2 break-all">
          LP minted. Tx: {createLp.data?.hash}
        </p>
      )}
      {createLp.isError && (
        <p className="text-danger text-xs">
          {createLp.error instanceof Error
            ? createLp.error.message
            : "Create LP failed"}
        </p>
      )}

      <p className="text-text-3 text-xs text-center">
        Creates a Uniswap v4 position NFT you own — not an LP burn.
      </p>
    </div>
  );
}
