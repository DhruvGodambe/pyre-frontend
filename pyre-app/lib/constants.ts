/* ============================================================================
   PYRE, Protocol constants (locked parameters)
   ----------------------------------------------------------------------------
   Single source of truth for every fixed number the UI references. Values track
   the deployed contracts (github DhruvGodambe/pyre-protocol). If the developer
   changes a parameter, change it HERE and the whole UI follows.
   ========================================================================== */

export const DECIMALS = 18;
export const WAD = 10n ** 18n;

/** Helper: human token amount -> on-chain bigint (18 decimals). */
export function pyre(amount: number): bigint {
  // Avoid float error for large amounts by splitting whole/frac.
  const [whole, frac = ""] = amount.toString().split(".");
  const fracPadded = (frac + "0".repeat(DECIMALS)).slice(0, DECIMALS);
  return BigInt(whole) * WAD + BigInt(fracPadded || "0");
}

/* --- Supply -------------------------------------------------------------- */
export const SUPPLY_CAP = pyre(1_000_000_000); // 1B $PYRE

/* --- Decay --------------------------------------------------------------- */
export const DECAY_RATE_INITIAL = 0.0045; // 0.45% / hour (Era 0)
export const DECAY_FLOOR = 0.0001; //        0.01% / hour (minimum forever)
export const HALVING_INTERVAL_EPOCHS = 2000; // ~83 days
export const EPOCH_SECONDS = 3600; // 1 hour

/* --- Drip (unstake exit) ------------------------------------------------- */
export const DRIP_DURATION_DAYS = 7;
export const DRIP_DURATION_SECONDS = DRIP_DURATION_DAYS * 24 * 3600;

/* --- Pyre Acolyte stages -------------------------------------------------
   NOTE: stage is driven by CUMULATIVE BURN WEIGHT (not staking time), per the
   deployed Acolyte contract (Acolyte._stageForBurn). The UI models burn-weight
   thresholds to match.
   ------------------------------------------------------------------------- */
export type Stage = 1 | 2 | 3 | 4;

export const STAGES: Record<
  Stage,
  { name: string; threshold: bigint; multiplier: number }
> = {
  1: { name: "EMBER", threshold: pyre(10_000), multiplier: 1 },
  2: { name: "FLAME", threshold: pyre(75_000), multiplier: 1.5 },
  3: { name: "FORGE", threshold: pyre(150_000), multiplier: 2 },
  4: { name: "PYRE", threshold: pyre(300_000), multiplier: 3 },
};

/** The Acolyte's display name at a tier: "Ember Acolyte" … "Pyre Acolyte". The
    Acolyte is the NFT earned by BURNING; its tier rises with cumulative burn
    weight. (The Hall of the Immolated grants a further "Immolated" prestige on top
    of your tier, earned by the Ascend rite; it is not itself a tier.) */
export function acolyteName(stage: Stage): string {
  const n = STAGES[stage].name; // "EMBER" … "PYRE"
  return `${n.charAt(0)}${n.slice(1).toLowerCase()} Acolyte`;
}

/** Resolve stage (and the next threshold) from a cumulative burn weight. */
export function stageFromWeight(weight: bigint): {
  stage: Stage;
  nextThreshold: bigint | null;
} {
  if (weight >= STAGES[4].threshold) return { stage: 4, nextThreshold: null };
  if (weight >= STAGES[3].threshold)
    return { stage: 3, nextThreshold: STAGES[4].threshold };
  if (weight >= STAGES[2].threshold)
    return { stage: 2, nextThreshold: STAGES[3].threshold };
  if (weight >= STAGES[1].threshold)
    return { stage: 1, nextThreshold: STAGES[2].threshold };
  // Below EMBER: no Pyre Acolyte yet; next target is the EMBER mint threshold.
  return { stage: 1, nextThreshold: STAGES[1].threshold };
}

/* --- Fees ---------------------------------------------------------------- */
export const HOOK_FEE_BPS = 400; // 4%
export const POOL_FEE_BPS = 100; // 1%
export const TOTAL_FEE_BPS = HOOK_FEE_BPS + POOL_FEE_BPS; // 5% each way
export const LAUNCH_FEE_MAX_BPS = 2000; // +20% buy-side at hour 0
export const LAUNCH_WINDOW_HOURS = 2; // DiamondInit anti-snipe window (23% → 5%)
export const TEAM_CUT_BPS = 2000; // 20% of buy-side ETH (base fee only)

/* --- Yield multipliers (Model B, mirrors the deployed contracts) ----------
   Yield is earned ONLY on STAKED $PYRE. Burning alone earns nothing. Your share
   of the $ETH pool = stakedBalance × tierMultiplier × lpBonus × immolatedBonus
   (see PyreStaking._calculateWeight). Every booster below is a YIELD multiplier
   on staked weight, and they STACK multiplicatively.

   - tierMultiplier: STAGES above (1× → 3×), by cumulative burn weight.
   - LP_BURN_BONUS: a PERMANENT flag for wallets that did an LP burn. It does NOT
     accelerate tiers; it multiplies staked yield, doubling it. LP burning is its
     own path: an LP Acolyte earns 2× the yield of a plain-burn one of the same
     tier. (Contract: Acolyte.LP_BURN_BONUS, consumed by PyreStaking via
     lpBurnBonus().)
   - IMMOLATED_YIELD_BOOST: granted by the Ascend rite in the Hall once you've reached Pyre.

   Permanent max for a Pyre + LP + Immolated staker: 3 × 2 × 1.2 = 7.2×.
   (A temporary quest/whitelist +20% can stack on top during its 7-day window.) */
export const LP_BURN_BONUS = 2.0; // 2× YIELD for LP burners (permanent flag, separate path from plain burn)

/* --- Immolated (prestige, NOT a tier) ------------------------------------
   The Immolated is the village's highest PRESTIGE, not a 5th tier. You become
   eligible once you REACH Pyre (the top Acolyte tier); the honor itself is earned
   in the Hall, not at the Forge. There the Ascend rite burns IMMOLATED_ASCEND_COST
   $PYRE (the LP path also pairs the equivalent $ETH, both locked forever), granting
   Immolate or LP Immolate to match your path. Perk: a permanent +20% YIELD, stacking
   with tier and LP. (Contract: ImmolatedGate.immolate().) */
export const IMMOLATED_STAGE_GATE: Stage = 4; // must have reached PYRE (top tier) to be eligible
export const IMMOLATED_PEAK = STAGES[4].threshold; // reach the Pyre peak to be eligible for the rite
export const IMMOLATED_ASCEND_COST = pyre(100_000); // the Ascend rite burns 100K $PYRE (LP path also pairs equivalent $ETH)
export const IMMOLATED_YIELD_BOOST = 1.2; // +20% yield for Immolated members
export const IMMOLATED_TIER_NAME = "Immolated Acolyte";
/** Effective top-tier yield multiplier: Pyre 3× plus the Immolated +20% = 3.6×
    (before LP). With LP too: 3 × 2 × 1.2 = 7.2×. Rounded to 2 decimals so the raw
    float (3 × 1.2 = 3.5999999999999996) never reaches the UI. */
export const IMMOLATED_MULTIPLIER = Math.round(STAGES[4].multiplier * IMMOLATED_YIELD_BOOST * 100) / 100;

/* --- Bonfire visual states (by total all-time burned) -------------------- */
export type BonfireState = "kindling" | "burning" | "raging" | "inferno";
export const BONFIRE_THRESHOLDS: { state: BonfireState; min: bigint }[] = [
  { state: "inferno", min: pyre(50_000_000) },
  { state: "raging", min: pyre(10_000_000) },
  { state: "burning", min: pyre(1_000_000) },
  { state: "kindling", min: 0n },
];

export function bonfireState(totalBurned: bigint): BonfireState {
  return (
    BONFIRE_THRESHOLDS.find((t) => totalBurned >= t.min)?.state ?? "kindling"
  );
}
