"use client";

/* Create LP tab — mint a full-range Uniswap v4 position NFT in the Pyre pool.
   Calls PositionManager.modifyLiquidities (same path as CreateLpPosition.s.sol). */

import { useMemo, useState } from "react";
import { useCreateLp, useSwapBalances, usePoolState } from "@/lib/hooks";
import { Button, Field } from "@/components/ui/primitives";
import { TOKENS } from "@/lib/config";
import { parseToken, toNumber, formatUsd, formatToken, formatEth } from "@/lib/format";

const ETH_GAS_RESERVE = 0.01;

export function CreateLpPanel() {
  const [ethText, setEthText] = useState("");
  const [pyreText, setPyreText] = useState("");
  const balances = useSwapBalances();
  const pool = usePoolState();
  const createLp = useCreateLp();

  const ethAmount = parseToken(ethText);
  const pyreAmount = parseToken(pyreText);

  const ethBal = balances.data?.eth;
  const pyreBal = balances.data?.pyre;

  const insufficientEth =
    ethBal !== undefined && ethAmount > 0n && ethAmount > ethBal;
  const insufficientPyre =
    pyreBal !== undefined && pyreAmount > 0n && pyreAmount > pyreBal;

  const cta = useMemo(() => {
    if (ethAmount <= 0n || pyreAmount <= 0n)
      return { label: "Enter $ETH and $PYRE", disabled: true } as const;
    if (insufficientEth) return { label: "Insufficient $ETH", disabled: true } as const;
    if (insufficientPyre) return { label: "Insufficient $PYRE", disabled: true } as const;
    return { label: "Create LP position", disabled: false } as const;
  }, [ethAmount, pyreAmount, insufficientEth, insufficientPyre]);

  function setEthFraction(fraction: number) {
    if (ethBal === undefined) return;
    let human = toNumber(ethBal) * fraction;
    human = Math.max(0, human - ETH_GAS_RESERVE);
    setEthText(human ? String(Number(human.toFixed(6))) : "");
  }

  function setPyreFraction(fraction: number) {
    if (pyreBal === undefined) return;
    const human = toNumber(pyreBal) * fraction;
    setPyreText(human ? String(Number(human.toFixed(4))) : "");
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

  return (
    <div id="exchange-lp" className="space-y-3 scroll-mt-24">
      <p className="text-text-2 text-xs leading-relaxed">
        Deposit $ETH + $PYRE into the Pyre Uniswap v4 pool as a full-range
        position NFT. You can later lock that NFT forever via the Forge LP burn
        path for the LP yield bonus.
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
        onChange={setEthText}
        placeholder="0.0"
        hint={
          ethBal !== undefined
            ? `Balance ${formatEth(ethBal)}`
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
        onChange={setPyreText}
        placeholder="0.0"
        hint={
          pyreBal !== undefined
            ? `Balance ${formatToken(pyreBal)}`
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
