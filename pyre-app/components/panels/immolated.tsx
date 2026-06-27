"use client";

/* HALL OF THE IMMOLATED, the inner order. The Immolated is the rarest Acolyte,
   the rank PAST Pyre: you reach it by burning at the Forge (all burning is at the
   Forge, there is no second burn here). Once past Pyre you ASCEND in this Hall,
   the one rite that lives here. The Hall is the prestige room: the Ascension + the
   Hall of Fame. (One yield pool today, so no separate pool to claim; the Immolated
   simply pull hardest on it, collected as normal staking yield.)
   States: not-connected, not-eligible (keep burning), eligible (ascend), member. */

import {
  useImmolatedPosition,
  useLeaderboard,
  useAscendImmolated,
} from "@/lib/hooks";
import { Panel, Stat } from "@/components/ui/primitives";
import { GameIcon, rankTile } from "@/components/ui/game-icon";
import { StateView, EmptyState } from "@/components/ui/state";
import { TxButton } from "@/components/ui/tx-button";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { formatToken, shortAddress } from "@/lib/format";

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

/* The Hall of Fame block, shown in every state (it's the prestige board). */
function HallFame({ you }: { you?: { rank: number; weight: bigint } }) {
  const board = useLeaderboard();
  return (
    <div className="pt-3 border-t border-surface-3/60">
      <h3 className="font-display text-lg text-brand">Hall of Fame</h3>
      <p className="text-text-3 text-xs mb-3">The village&rsquo;s greatest burners.</p>
      <StateView query={board}>{(rows) => <HallOfFame rows={rows} you={you} />}</StateView>
    </div>
  );
}

export function ImmolatedPanel() {
  const pos = useImmolatedPosition();
  const ascend = useAscendImmolated();

  return (
    <Panel title="Hall of the Immolated" tagline="The highest rank in the village">
      <RequireWallet message="Connect to see if you've reached the Immolated.">
        <StateView query={pos}>
          {(p) =>
            p.isMember ? (
              /* MEMBER: you've ascended. Your standing + the Hall of Fame. */
              <div className="space-y-5">
                <div className="rounded-panel border border-brand/40 bg-brand/10 px-4 py-4 text-center">
                  <p className="text-text-3 text-[11px] uppercase tracking-widest">You are</p>
                  <p className="font-display text-3xl text-brand leading-tight">Immolated</p>
                  <p className="text-text-2 text-xs mt-1">
                    The rarest Acolyte, the strongest pull on the yield.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Your burn weight" value={formatToken(p.weight)} accent />
                  <Stat label="Your rank" value={p.rank != null ? `#${p.rank}` : "—"} />
                </div>
                <HallFame you={p.rank != null ? { rank: p.rank, weight: p.weight } : undefined} />
              </div>
            ) : p.eligible ? (
              /* ELIGIBLE: burned past Pyre at the Forge, ready for the rite. */
              <div className="space-y-5">
                <div
                  id="immolated-action"
                  className="rounded-panel border border-brand/40 bg-gradient-to-b from-brand/15 to-surface/40 px-5 py-6 text-center scroll-mt-24"
                >
                  <h3 className="font-display text-2xl text-brand">You&rsquo;ve reached the peak</h3>
                  <p className="text-text-2 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                    Your burning at the Forge has carried you past Pyre. Take the final rite and
                    ascend to the Immolated, the highest rank in the village.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <TxButton tx={ascend} onClick={() => ascend.mutate()} pendingLabel="Ascending…">
                      Ascend to the Immolated
                    </TxButton>
                  </div>
                </div>
                <HallFame />
              </div>
            ) : (
              /* NOT ELIGIBLE: keep burning at the Forge to reach past Pyre. */
              <div className="space-y-5">
                <EmptyState
                  icon="⌖"
                  title="Not yet"
                  message="The Immolated is the rank past Pyre. Keep burning $PYRE at the Forge to ascend."
                />
                <div className="flex justify-center">
                  <NavCta to="forge">Burn at the Forge →</NavCta>
                </div>
                <HallFame />
              </div>
            )
          }
        </StateView>
      </RequireWallet>
    </Panel>
  );
}
