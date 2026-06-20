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
import { StateView, EmptyState } from "@/components/ui/state";
import { TxButton } from "@/components/ui/tx-button";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { formatToken, formatEth, parseToken, shortAddress } from "@/lib/format";
import { STAGES } from "@/lib/constants";

type HallRow = { rank: number; address: `0x${string}`; weight: bigint };

/* The Hall of Fame, a podium for the top 3 Immolated, then ranks 4–10. Replaces
   the old text leaderboard with something that reads like a wall of champions. */
function HallOfFame({ rows }: { rows: HallRow[] }) {
  const top = rows.slice(0, 10);
  if (top.length === 0)
    return <p className="text-text-3 text-sm">No one has reached the Hall yet. Be the first.</p>;
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const medal = ["🥇", "🥈", "🥉"];
  // Visual podium order: 2nd (left), 1st (centre, raised), 3rd (right).
  const order = ["order-1", "order-2 -mt-3", "order-3"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 items-end gap-2">
        {podium.map((r, i) => (
          <div
            key={r.rank}
            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center ${order[i]} ${
              i === 0 ? "border-brand/50 bg-brand/10" : "border-surface-3/60 bg-surface-2"
            }`}
          >
            <div className="text-2xl leading-none" aria-hidden>
              {medal[i]}
            </div>
            <div
              className="grid h-11 w-11 place-items-center rounded-full text-bg text-sm font-medium"
              style={{ background: avatarGradient(r.address) }}
              aria-hidden
            >
              {initial(r.address)}
            </div>
            <div className="tabular w-full truncate text-xs text-text">{shortAddress(r.address)}</div>
            <div className="tabular text-[11px] text-brand">{formatToken(r.weight)}</div>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <ul className="space-y-1">
          {rest.map((r) => (
            <li key={r.rank} className="flex items-center gap-2.5 rounded-md bg-surface-2 px-3 py-2">
              <span className="tabular w-5 text-center text-xs text-text-3">{r.rank}</span>
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-bg text-[10px] font-medium"
                style={{ background: avatarGradient(r.address) }}
                aria-hidden
              >
                {initial(r.address)}
              </span>
              <span className="tabular flex-1 truncate text-sm text-text-2">{shortAddress(r.address)}</span>
              <span className="tabular text-xs text-text">{formatToken(r.weight)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Deterministic avatar (placeholder until real PFP art), same address, same colours. */
function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 68% 55%), hsl(${(h + 48) % 360} 70% 45%))`;
}
function initial(addr: string): string {
  return addr.replace(/^0x/i, "").charAt(0).toUpperCase();
}

export function ImmolatedPanel() {
  const pos = useImmolatedPosition();
  const board = useLeaderboard();
  const [amount, setAmount] = useState("");
  const burn = useImmolatedBurn();
  const claim = useClaimImmolatedYield();

  return (
    <Panel title="Hall of the Immolated" tagline="The inner order">
      <RequireWallet message="Connect to learn whether the Hall opens for you.">
        <StateView query={pos}>
          {(p) =>
            !p.isMember ? (
              <EmptyState
                icon="⌖"
                title="The Immolated do not announce themselves"
                message="Reach the Pyre: Stage 4, plus 10,000 $PYRE burned into the Hall, and the door opens."
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
                    pendingLabel="Committing…"
                  >
                    Add to weight
                  </TxButton>
                </div>

                <div className="pt-3 border-t border-surface-3/60">
                  <h3 className="font-display text-lg text-brand">Hall of Fame</h3>
                  <p className="text-text-3 text-xs mb-3">The Immolated who burn the deepest.</p>
                  <StateView query={board}>{(rows) => <HallOfFame rows={rows} />}</StateView>
                </div>
              </div>
            )
          }
        </StateView>
      </RequireWallet>
    </Panel>
  );
}
