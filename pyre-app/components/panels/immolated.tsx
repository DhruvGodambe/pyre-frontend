"use client";

/* HALL OF THE IMMOLATED, the inner order. The Immolated is the highest PRESTIGE,
   not a tier: once you REACH Pyre (the top Acolyte tier) you become eligible, and
   the honor is earned HERE via the Ascend rite, which burns 100K $PYRE (the LP path
   also pairs the equivalent $ETH), granting Immolate or LP Immolate to match your
   path. The Hall is the prestige room: the Ascend rite + the Hall of Fame. Members
   keep a permanent +20% yield. (One yield pool today, so no separate pool to claim;
   the Immolated simply pull hardest on it, collected as normal staking yield.)
   States: not-connected, not-eligible (reach Pyre), eligible (ascend), member. */

import {
  useImmolatedPosition,
  useLeaderboard,
  useAscendImmolated,
  useStakingPosition,
} from "@/lib/hooks";
import { Panel, Stat } from "@/components/ui/primitives";
import { GameIcon, rankTile } from "@/components/ui/game-icon";
import { StateView, EmptyState } from "@/components/ui/state";
import { TxButton } from "@/components/ui/tx-button";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { formatToken, shortAddress } from "@/lib/format";
import { IMMOLATED_ASCEND_COST } from "@/lib/constants";

type HallRow = { rank: number; address: `0x${string}`; weight: bigint };

/* The Hall of Fame: the top 5 Immolated burners, each marked with the designer's
   numbered rank tile (same icons as the Ashen Cup leaderboard). Like the Ashen
   Cup, anyone ranked below 5th sees their own position pinned at the bottom. */
function HallOfFame({ rows, you }: { rows: HallRow[]; you?: { rank: number; weight: bigint } }) {
  const top = rows.slice(0, 5);
  if (top.length === 0)
    return <p className="text-text-3 text-sm">No one has reached the Hall yet. Be the first.</p>;
  const youInTop = you ? top.some((r) => r.rank === you.rank) : false;
  return (
    <div className="space-y-1">
      <ol className="space-y-1">
        {top.map((r) => {
          const isYou = r.rank === you?.rank;
          const tile = rankTile(r.rank, isYou);
          return (
            <li
              key={r.rank}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 ${
                isYou ? "bg-brand/10 border border-brand/40" : "forged-card"
              }`}
            >
              {tile ? (
                <GameIcon name={tile} size={30} alt={`Rank ${r.rank}`} className="shrink-0" />
              ) : (
                <span className="tabular w-7 text-center text-xs text-text-3 shrink-0">#{r.rank}</span>
              )}
              <span className="tabular flex-1 truncate text-sm text-text-2">
                {shortAddress(r.address)}
                {isYou && <span className="text-brand"> (you)</span>}
              </span>
              <span className="tabular text-xs text-text shrink-0">{formatToken(r.weight)}</span>
            </li>
          );
        })}
      </ol>
      {you && !youInTop && (
        <div className="space-y-1">
          {/* Show the "jump" dots only when ranks are actually skipped (rank 7+). */}
          {you.rank > top.length + 1 && (
            <div
              className="flex justify-center text-text-3 leading-none tracking-[0.3em] select-none"
              aria-hidden
            >
              ···
            </div>
          )}
          <div className="flex items-center gap-2.5 rounded-md px-3 py-2 bg-brand/10 border border-brand/40">
            <span className="tabular w-7 text-center text-sm text-brand font-medium shrink-0">
              #{you.rank}
            </span>
            <span className="tabular flex-1 truncate text-sm text-text-2">You</span>
            <span className="tabular text-xs text-text shrink-0">{formatToken(you.weight)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* The Hall of Fame board body (fills the right-hand panel). The Panel's own
   forged name plate carries the title, so this is just the ranked list. */
function HallFameBody({ you }: { you?: { rank: number; weight: bigint } }) {
  const board = useLeaderboard();
  return <StateView query={board}>{(rows) => <HallOfFame rows={rows} you={you} />}</StateView>;
}

export function ImmolatedPanel() {
  const pos = useImmolatedPosition();
  const stakePos = useStakingPosition();
  const ascend = useAscendImmolated();
  // The Ascend rite BURNS 100K $PYRE, so eligibility (reached Pyre by past burns)
  // isn't enough: the wallet must still hold that much to spend now.
  const liquid = stakePos.data?.liquidBalance ?? 0n;
  const canAffordAscend = liquid >= IMMOLATED_ASCEND_COST;
  const mp = pos.data;
  const you =
    mp?.isMember && mp.rank != null ? { rank: mp.rank, weight: mp.weight } : undefined;

  // Two panels side by side across the wide interior: your standing / the rite on
  // the left, the Hall of Fame board on the right (always shown, it's the prestige
  // board). Stacks to one column on mobile.
  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-5 lg:items-start">
      {/* LEFT (3/5): your standing, the Ascend rite, or how to become eligible. */}
      <div className="lg:col-span-3">
        <Panel title="Hall of the Immolated" tagline="The highest prestige in the kingdom" frame="forged">
          <RequireWallet message="Connect to see if you've reached the Immolated.">
            <StateView query={pos}>
              {(p) =>
                p.isMember ? (
                  /* MEMBER: you've ascended. Your standing. */
                  <div className="space-y-5">
                    <div className="forged-card forged-card--lit px-4 py-6 text-center">
                      <div className="flex justify-center">
                        <GameIcon name="immolated" size={64} alt="" className="drop-shadow-[0_2px_12px_rgba(240,169,59,0.4)]" />
                      </div>
                      <p className="text-text-3 text-[11px] uppercase tracking-widest mt-2">You are</p>
                      <p className="font-display text-4xl text-brand leading-tight">
                        {p.isLP ? "LP Immolated" : "Immolated"}
                      </p>
                      <p className="text-text-2 text-xs mt-1">
                        The rarest Acolyte, the strongest pull on the yield.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="forged-card px-4 py-3.5">
                        <Stat
                          label="Yield boost"
                          value={`+${Math.round((p.yieldBoost - 1) * 100)}%`}
                          accent
                        />
                      </div>
                      <div className="forged-card px-4 py-3.5">
                        <Stat label="Your rank" value={p.rank != null ? `#${p.rank}` : "—"} />
                      </div>
                      <div className="forged-card px-4 py-3.5">
                        <Stat label="Your burn weight" value={formatToken(p.weight)} />
                      </div>
                      <div className="forged-card px-4 py-3.5">
                        <Stat label="Effective pool weight" value={formatToken(p.boostedWeight)} />
                      </div>
                    </div>
                    <p className="text-text-3 text-[11px] leading-relaxed">
                      Your +20% boost lifts your share of the yield pool: you pull on it with your
                      effective weight, not your raw burn weight.
                    </p>
                  </div>
                ) : p.eligible ? (
                  /* ELIGIBLE: reached Pyre (top tier), ready for the Ascend rite here. */
                  <div
                    id="immolated-action"
                    className="forged-card forged-card--lit px-5 py-8 text-center scroll-mt-24"
                  >
                    <div className="flex justify-center mb-2">
                      <GameIcon name="immolated" size={56} alt="" className="drop-shadow-[0_2px_12px_rgba(240,169,59,0.4)]" />
                    </div>
                    <h3 className="font-display text-3xl text-brand">You&rsquo;ve reached Pyre</h3>
                    <p className="text-text-2 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                      You&rsquo;re at the top tier. Take the Ascend rite here in the Hall, which burns{" "}
                      <span className="text-brand">
                        {formatToken(IMMOLATED_ASCEND_COST)} $PYRE
                        {p.isLP ? " plus the equivalent $ETH" : ""}
                      </span>
                      , to become {p.isLP ? "LP Immolated" : "Immolated"}, the highest prestige in the
                      kingdom, and claim a permanent
                      <span className="text-brand"> +20% boost</span> to your share of the yield pool.
                    </p>
                    <div className="mt-5 flex flex-col items-center gap-1.5">
                      <TxButton
                        tx={ascend}
                        onClick={() => ascend.mutate()}
                        pendingLabel="Ascending…"
                        disabled={!canAffordAscend}
                      >
                        Take the Ascend rite
                      </TxButton>
                      {!canAffordAscend && (
                        <p className="text-danger text-[11px]">
                          Need {formatToken(IMMOLATED_ASCEND_COST)} $PYRE to ascend, you hold{" "}
                          {formatToken(liquid)}.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* NOT ELIGIBLE: reach Pyre (the top tier) at the Forge first. */
                  <div className="space-y-5 py-4">
                    <EmptyState
                      icon={<GameIcon name="immolated" size={64} alt="" className="opacity-40 grayscale" />}
                      title="Not yet"
                      message="The Immolated is the kingdom's highest prestige, not a tier. Reach Pyre, the top Acolyte tier, by burning at the Forge (normal or LP), then return here to take the Ascend rite: burn 100K $PYRE to ascend and claim a permanent +20% boost to your yield share."
                    />
                    <div className="flex justify-center">
                      <NavCta to="forge" className="w-auto">Burn at the Forge →</NavCta>
                    </div>
                  </div>
                )
              }
            </StateView>
          </RequireWallet>
        </Panel>
      </div>

      {/* RIGHT (2/5): the Hall of Fame board, always shown. */}
      <div className="lg:col-span-2">
        <Panel title="Hall of Fame" tagline="The kingdom's greatest burners" frame="forged">
          <HallFameBody you={you} />
        </Panel>
      </div>
    </div>
  );
}
