"use client";

/* HALL OF THE IMMOLATED — the inner order. Gated: Stage 4 (PYRE) + 10,000 extra
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

                <div className="space-y-2">
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
                  <h3 className="text-text-3 text-xs uppercase tracking-wider mb-2">Leaderboard</h3>
                  <StateView query={board}>
                    {(rows) => (
                      <ul className="space-y-1">
                        {rows.map((r) => (
                          <li key={r.rank} className="flex items-center justify-between text-sm">
                            <span className="text-text-2 tabular">
                              #{r.rank} {shortAddress(r.address)}
                            </span>
                            <span className="flex items-center gap-2">
                              <Badge tone="brand">{STAGES[r.stage].name}</Badge>
                              <span className="tabular text-text">{formatToken(r.weight)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
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
