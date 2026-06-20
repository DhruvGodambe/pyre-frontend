"use client";

/* THE BLACK MARKET, Pyre Acolyte marketplace, live at launch. A branded window
   over external listings (OpenSea/Blur), no separate contract.
   Spec: 05-ui-screens.md → "The Black Market". Key state: empty market at launch
   ("the market is cold, no Acolytes have risen yet"). */

import { useState } from "react";
import { useMarketListings } from "@/lib/hooks";
import { Panel, Badge } from "@/components/ui/primitives";
import { StateView, EmptyState } from "@/components/ui/state";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { formatEth } from "@/lib/format";
import type { MarketFilter } from "@/lib/datasource";
import type { Acolyte } from "@/lib/types";

export function BlackMarketPanel() {
  const [filter, setFilter] = useState<MarketFilter>({});
  const listings = useMarketListings(filter);

  return (
    <Panel title="The Black Market" tagline="Buy & sell Acolytes">
      <div className="flex gap-2 mb-4 text-xs">
        <FilterChip active={!filter.lpOnly && !filter.immolatedOnly} onClick={() => setFilter({})}>
          All
        </FilterChip>
        <FilterChip active={!!filter.lpOnly} onClick={() => setFilter({ lpOnly: true })}>
          LP variant
        </FilterChip>
        <FilterChip active={!!filter.immolatedOnly} onClick={() => setFilter({ immolatedOnly: true })}>
          Immolated
        </FilterChip>
      </div>

      <StateView query={listings}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon="🜂"
              title="The market is cold"
              message="No Acolytes have risen yet. They appear here the moment wallets begin to burn, be the first to forge one."
              action={
                <NavCta to="forge" tab="burn" className="">
                  Forge the first Acolyte
                </NavCta>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {rows.map((l) => {
                const acolyte: Acolyte = {
                  exists: true,
                  tokenId: l.tokenId,
                  stage: l.stage,
                  stageName: l.stageName,
                  multiplier: l.multiplier,
                  cumulativeBurnWeight: l.cumulativeBurnWeight,
                  nextStageThreshold: l.nextStageThreshold,
                  isLP: l.isLP,
                  isImmolated: l.isImmolated,
                  seed: null,
                  svg: l.svg,
                };
                return (
                  <a
                    key={l.tokenId}
                    href={l.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md bg-surface-2 p-2 hover:bg-surface-3 transition-colors duration-fast"
                  >
                    <AcolyteArt acolyte={acolyte} size={120} />
                    <div className="flex items-center justify-between mt-2">
                      <Badge tone="brand">{l.stageName}</Badge>
                      <span className="tabular text-text text-sm">{formatEth(l.priceEth)}</span>
                    </div>
                    <div className="text-text-3 text-[10px] mt-1">{l.multiplier}× yield</div>
                  </a>
                );
              })}
            </div>
          )
        }
      </StateView>
    </Panel>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm px-2.5 py-1 ${active ? "bg-brand text-bg" : "bg-surface-2 text-text-2"}`}
    >
      {children}
    </button>
  );
}
