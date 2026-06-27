"use client";

/* HALL OF THE IMMOLATED, the inner order. Gated: Stage 4 (PYRE) + 10,000 extra
   burned. Spec: 05-ui-screens.md → "Hall of the Immolated".
   States: not-connected, outsider (locked sigil), member. */

import { useState } from "react";
import {
  useImmolatedPosition,
  useLeaderboard,
  useImmolatedBurn,
  useClaimImmolatedYield,
} from "@/lib/hooks";
import { Panel, Stat, Field, Badge } from "@/components/ui/primitives";
import { GameIcon, rankTile } from "@/components/ui/game-icon";
import { StateView, EmptyState } from "@/components/ui/state";
import { TxButton } from "@/components/ui/tx-button";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { formatToken, formatEth, parseToken, shortAddress } from "@/lib/format";
import { STAGES } from "@/lib/constants";

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
                isYou ? "bg-brand/10 border border-brand/40" : "bg-surface-2"
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

export function ImmolatedPanel() {
  const pos = useImmolatedPosition();
  const board = useLeaderboard();
  const [amount, setAmount] = useState("");
  const burn = useImmolatedBurn();
  const claim = useClaimImmolatedYield();

  return (
    <Panel title="Hall of the Immolated" tagline="Top-tier rewards pool">
      <RequireWallet message="Connect to see if you're eligible.">
        <StateView query={pos}>
          {(p) =>
            !p.isMember ? (
              <EmptyState
                icon="⌖"
                title="Not eligible yet"
                message="Reach the top Acolyte tier (Pyre), then burn 10,000 $PYRE into the Hall to join."
              />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Your burn weight" value={formatToken(p.weight)} accent />
                  <Stat label="Your rank" value={`#${p.rank}`} />
                  <Stat label="Pending yield" value={formatEth(p.pendingYieldEth)} accent />
                  <Stat label="Pool total weight" value={formatToken(p.poolTotalWeight)} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-surface-3/60">
                  <span className="text-text-2 text-sm">Claim your share of the 25% pool</span>
                  <TxButton
                    tx={claim}
                    variant="ghost"
                    disabled={p.pendingYieldEth <= 0n}
                    onClick={() => claim.mutate()}
                    pendingLabel="Claiming…"
                  >
                    Claim ETH
                  </TxButton>
                </div>

                <div id="immolated-action" className="space-y-2 scroll-mt-24">
                  <Field label="Burn more into the Hall" value={amount} onChange={setAmount} suffix="$PYRE" />
                  <TxButton
                    tx={burn}
                    disabled={parseToken(amount) <= 0n}
                    onClick={() => burn.mutate(parseToken(amount))}
                    pendingLabel="Burning…"
                  >
                    Burn into the Hall
                  </TxButton>
                </div>

                <div className="pt-3 border-t border-surface-3/60">
                  <h3 className="font-display text-lg text-brand">Hall of Fame</h3>
                  <p className="text-text-3 text-xs mb-3">Members who&rsquo;ve burned the most.</p>
                  <StateView query={board}>
                    {(rows) => (
                      <HallOfFame
                        rows={rows}
                        you={p.rank != null ? { rank: p.rank, weight: p.weight } : undefined}
                      />
                    )}
                  </StateView>
                </div>
              </div>
            )
          }
        </StateView>
      </RequireWallet>
    </Panel>
  );
}
