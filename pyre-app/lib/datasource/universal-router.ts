/* ============================================================================
   Universal Router — V4_SWAP calldata builder
   ----------------------------------------------------------------------------
   Builds execute(commands, inputs, deadline) args for a single-hop PYRE↔ETH
   swap. Uses the same PoolKey as getPoolKey() / quotes so PoolKey.hooks is
   always the PYRE diamond (PoolManager → beforeSwap/afterSwap).
   ========================================================================== */

import { encodeAbiParameters, encodePacked, type Address, type Hex } from "viem";
import { CONTRACTS } from "../config";
import { getPoolId, type PoolKey } from "./abis";

/** Universal Router Commands.V4_SWAP */
const CMD_V4_SWAP = "0x10" as const;

/** v4-periphery Actions */
const ACTION_SWAP_EXACT_IN_SINGLE = 0x06;
const ACTION_SWAP_EXACT_OUT_SINGLE = 0x08;
const ACTION_SETTLE_ALL = 0x0c;
const ACTION_TAKE_ALL = 0x0f;

const NATIVE = "0x0000000000000000000000000000000000000000" as Address;

const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export interface V4SwapExecuteArgs {
  commands: Hex;
  inputs: Hex[];
  deadline: bigint;
  /** msg.value — ETH amount for buys; 0 for sells */
  value: bigint;
  /** PoolKey.hooks baked into the swap params (must equal CONTRACTS.hook). */
  hooks: Address;
  /** keccak256(abi.encode(poolKey)) — must match diamond getRegisteredPoolId(). */
  poolId: Hex;
}

export interface BuildV4SwapParams {
  kind: "exactIn" | "exactOut";
  /** true = ETH→PYRE (buy), false = PYRE→ETH (sell) */
  zeroForOne: boolean;
  key: PoolKey;
  /** exactIn: amountIn; exactOut: amountOut */
  amount: bigint;
  /** exactIn: minOut; exactOut: maxIn */
  limitAmount: bigint;
  deadline: bigint;
}

function encodeExactInSingle(
  key: PoolKey,
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint
): Hex {
  return encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "minHopPriceX36", type: "uint256" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey: {
          currency0: key.currency0,
          currency1: key.currency1,
          fee: key.fee,
          tickSpacing: key.tickSpacing,
          hooks: key.hooks,
        },
        zeroForOne,
        amountIn,
        amountOutMinimum,
        minHopPriceX36: 0n,
        hookData: "0x",
      },
    ]
  );
}

function encodeExactOutSingle(
  key: PoolKey,
  zeroForOne: boolean,
  amountOut: bigint,
  amountInMaximum: bigint
): Hex {
  return encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
          { name: "zeroForOne", type: "bool" },
          { name: "amountOut", type: "uint128" },
          { name: "amountInMaximum", type: "uint128" },
          { name: "minHopPriceX36", type: "uint256" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey: {
          currency0: key.currency0,
          currency1: key.currency1,
          fee: key.fee,
          tickSpacing: key.tickSpacing,
          hooks: key.hooks,
        },
        zeroForOne,
        amountOut,
        amountInMaximum,
        minHopPriceX36: 0n,
        hookData: "0x",
      },
    ]
  );
}

function encodeCurrencyAmount(currency: Address, amount: bigint): Hex {
  return encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currency, amount]
  );
}

/**
 * Encode Universal Router execute() args for a single-pool V4 swap.
 * hookData is always 0x; minHopPriceX36 is 0 (no per-hop price floor).
 * Rejects a PoolKey whose hooks address is not the configured PYRE diamond.
 */
export function buildV4SwapExecuteArgs(p: BuildV4SwapParams): V4SwapExecuteArgs {
  const diamond = CONTRACTS.hook;
  if (!diamond) {
    throw new Error("Pool not configured: missing PYRE hook address.");
  }
  if (p.key.hooks.toLowerCase() !== diamond.toLowerCase()) {
    throw new Error(
      `PoolKey.hooks (${p.key.hooks}) does not match PYRE diamond (${diamond}).`
    );
  }

  const currencyIn = p.zeroForOne ? p.key.currency0 : p.key.currency1;
  const currencyOut = p.zeroForOne ? p.key.currency1 : p.key.currency0;
  const isNativeIn = currencyIn.toLowerCase() === NATIVE.toLowerCase();

  let actions: Hex;
  let params: Hex[];

  if (p.kind === "exactIn") {
    actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL]
    );
    params = [
      encodeExactInSingle(p.key, p.zeroForOne, p.amount, p.limitAmount),
      encodeCurrencyAmount(currencyIn, p.amount),
      encodeCurrencyAmount(currencyOut, p.limitAmount),
    ];
  } else {
    actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [ACTION_SWAP_EXACT_OUT_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL]
    );
    params = [
      encodeExactOutSingle(p.key, p.zeroForOne, p.amount, p.limitAmount),
      encodeCurrencyAmount(currencyIn, p.limitAmount),
      encodeCurrencyAmount(currencyOut, p.amount),
    ];
  }

  // V4_SWAP input = abi.encode(actions, params)
  const v4SwapInput = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, params]
  );

  const value = isNativeIn
    ? p.kind === "exactIn"
      ? p.amount
      : p.limitAmount
    : 0n;

  return {
    commands: CMD_V4_SWAP,
    inputs: [v4SwapInput],
    deadline: p.deadline,
    value,
    hooks: p.key.hooks,
    poolId: getPoolId(p.key),
  };
}
