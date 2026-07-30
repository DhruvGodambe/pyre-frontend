/* ============================================================================
   Uniswap v4 PositionManager mint helpers (Create LP)
   ----------------------------------------------------------------------------
   Mirrors CreateLpPosition.s.sol: MINT_POSITION + SETTLE_PAIR + SWEEP into the
   existing Pyre pool. Liquidity is sized from the user's ETH + PYRE amounts at
   the current sqrt price (full-range ticks).
   ========================================================================== */

import {
  encodeAbiParameters,
  encodePacked,
  type Address,
  type Hex,
} from "viem";
import type { PoolKey } from "./abis";

/** v4 Actions — same bytes as v4-periphery Actions.sol */
export const ACTION_MINT_POSITION = 0x02;
export const ACTION_SETTLE_PAIR = 0x0d;
export const ACTION_SWEEP = 0x14;

/** Full-range usable ticks for tickSpacing 60 (matches CreateLpPosition.s.sol). */
export const FULL_RANGE_TICK_LOWER = -887220;
export const FULL_RANGE_TICK_UPPER = 887220;

const Q96 = 2n ** 96n;
const MAX_UINT128 = (1n << 128n) - 1n;

/** TickMath.getSqrtRatioAtTick — Uniswap v3/v4. */
export function getSqrtRatioAtTick(tick: number): bigint {
  if (tick < -887272 || tick > 887272) {
    throw new Error(`tick out of range: ${tick}`);
  }
  const absTick = tick < 0 ? -tick : tick;
  let ratio =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;
  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = (2n ** 256n - 1n) / ratio;

  // Round up to Q64.96 if needed
  return ratio % (1n << 32n) === 0n ? ratio >> 32n : (ratio >> 32n) + 1n;
}

function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

function liquidityForAmount0(sqrtA: bigint, sqrtB: bigint, amount0: bigint): bigint {
  if (sqrtA > sqrtB) [sqrtA, sqrtB] = [sqrtB, sqrtA];
  if (sqrtA === 0n || sqrtB === sqrtA || amount0 === 0n) return 0n;
  const intermediate = mulDiv(sqrtA, sqrtB, Q96);
  return mulDiv(amount0, intermediate, sqrtB - sqrtA);
}

function liquidityForAmount1(sqrtA: bigint, sqrtB: bigint, amount1: bigint): bigint {
  if (sqrtA > sqrtB) [sqrtA, sqrtB] = [sqrtB, sqrtA];
  if (sqrtB === sqrtA || amount1 === 0n) return 0n;
  return mulDiv(amount1, Q96, sqrtB - sqrtA);
}

/** LiquidityAmounts.getLiquidityForAmounts for a full-range position. */
export function liquidityForAmounts(
  sqrtPriceX96: bigint,
  amount0: bigint,
  amount1: bigint,
  tickLower = FULL_RANGE_TICK_LOWER,
  tickUpper = FULL_RANGE_TICK_UPPER
): bigint {
  const sqrtA = getSqrtRatioAtTick(tickLower);
  const sqrtB = getSqrtRatioAtTick(tickUpper);
  if (sqrtPriceX96 <= sqrtA) return liquidityForAmount0(sqrtA, sqrtB, amount0);
  if (sqrtPriceX96 >= sqrtB) return liquidityForAmount1(sqrtA, sqrtB, amount1);
  const l0 = liquidityForAmount0(sqrtPriceX96, sqrtB, amount0);
  const l1 = liquidityForAmount1(sqrtA, sqrtPriceX96, amount1);
  return l0 < l1 ? l0 : l1;
}

export type MintLpUnlock = {
  unlockData: Hex;
  ethValue: bigint;
  liquidity: bigint;
};

/** Encode PositionManager.modifyLiquidities payload for a full-range mint. */
export function encodeMintLpUnlock(args: {
  key: PoolKey;
  recipient: Address;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  tickLower?: number;
  tickUpper?: number;
}): MintLpUnlock {
  const tickLower = args.tickLower ?? FULL_RANGE_TICK_LOWER;
  const tickUpper = args.tickUpper ?? FULL_RANGE_TICK_UPPER;
  if (args.liquidity <= 0n) throw new Error("Liquidity is zero — increase ETH or PYRE.");

  const amount0Max =
    args.amount0Max > MAX_UINT128 ? MAX_UINT128 : args.amount0Max;
  const amount1Max =
    args.amount1Max > MAX_UINT128 ? MAX_UINT128 : args.amount1Max;

  const actions = encodePacked(
    ["uint8", "uint8", "uint8"],
    [ACTION_MINT_POSITION, ACTION_SETTLE_PAIR, ACTION_SWEEP]
  );

  const mintParams = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { type: "int24" },
      { type: "int24" },
      { type: "uint256" },
      { type: "uint128" },
      { type: "uint128" },
      { type: "address" },
      { type: "bytes" },
    ],
    [
      {
        currency0: args.key.currency0,
        currency1: args.key.currency1,
        fee: args.key.fee,
        tickSpacing: args.key.tickSpacing,
        hooks: args.key.hooks,
      },
      tickLower,
      tickUpper,
      args.liquidity,
      amount0Max,
      amount1Max,
      args.recipient,
      "0x",
    ]
  );

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }],
    [args.key.currency0, args.key.currency1]
  );

  const sweepParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }],
    [args.key.currency0, args.recipient]
  );

  const unlockData = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [mintParams, settleParams, sweepParams]]
  );

  return {
    unlockData,
    ethValue: amount0Max,
    liquidity: args.liquidity,
  };
}
