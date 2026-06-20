/* ============================================================================
   PYRE, Protocol constants (locked parameters)
   ----------------------------------------------------------------------------
   Single source of truth for every fixed number the UI references. Values are
   taken verbatim from dev/DEV_BRIEF.md ("Locked Parameters"). If the developer
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
   NOTE FOR DEV: stage is driven by CUMULATIVE BURN WEIGHT (not staking time).
   The currentStage() sample in DEV_BRIEF.md uses accumulatedStakingTime, that
   is flagged in the brief as leftover OLD-architecture code. The authoritative
   "Locked Parameters" table + CORE.md define stage by cumulative burn. The UI
   models burn-weight thresholds; confirm with the developer before launch.
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
    weight. (The Hall of the Immolated holds a further "Immolated Acolyte" tier.) */
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
export const LAUNCH_WINDOW_HOURS = 24;
export const TEAM_CUT_BPS = 2000; // 20% of buy-side ETH (base fee only)

/* --- Immolated ----------------------------------------------------------- */
export const IMMOLATED_STAGE_GATE: Stage = 4; // must be PYRE
export const IMMOLATED_MIN_BURN = pyre(10_000); // extra burn to activate
export const LP_WEIGHT_BONUS = 1.2; // +20%

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
