"use client";

/* THE BLACK MARKET, Pyre Acolyte marketplace, live at launch. A branded window
   over external listings (OpenSea/Blur), no separate contract.
   Spec: 05-ui-screens.md → "The Black Market".

   Two tabs:
     • Listings        the grid of Acolytes for sale, filterable by tier
                        (Ember/Flame/Forge/Pyre) + variant (LP/Immolated) + sort.
     • Recent activity  the live event stream (sales, listings, offers, delistings)
                        so the market visibly breathes, even when thin.

   Key state: empty market at launch ("the market is cold, no Acolytes have
   risen yet"). Filters reuse the same MarketFilter across both tabs so the
   designer can see one consistent control bar driving the whole building. */

import { useEffect, useState } from "react";
import { useMarketListings, useMarketActivity, useAcolyte } from "@/lib/hooks";
import { useNavigation } from "@/lib/navigation";
import { Panel, Badge, Stat, Chip, Select } from "@/components/ui/primitives";
import { StateView, EmptyState, Skeleton } from "@/components/ui/state";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { ImageButton, ImageArt, type ImageButtonName } from "@/components/ui/image-button";
import { GameIcon, tierCrest } from "@/components/ui/game-icon";
import { formatEth, formatAgo, shortAddress, formatToken } from "@/lib/format";
import { STAGES, acolyteName, type Stage } from "@/lib/constants";
import type { MarketFilter, MarketSort } from "@/lib/datasource";
import type { Acolyte, MarketActivityKind } from "@/lib/types";

/* The Black Market is a branded window over OpenSea/Blur (no PYRE listing
   contract), so listing your own Acolyte links out to the marketplace, where
   the trade actually settles. */
const MARKETPLACE_URL = "https://opensea.io/";

const TIERS: Stage[] = [1, 2, 3, 4];

const SORTS: { id: MarketSort; label: string }[] = [
  { id: "price-asc", label: "Price: low → high" },
  { id: "price-desc", label: "Price: high → low" },
  { id: "recent", label: "Recently listed" },
  { id: "tier-desc", label: "Highest tier" },
];

const ACTIVITY_META: Record<
  MarketActivityKind,
  { label: string; tone: "neutral" | "brand" | "success" | "danger"; verb: string }
> = {
  sale: { label: "Sold", tone: "success", verb: "sold for" },
  listing: { label: "Listed", tone: "brand", verb: "listed at" },
  offer: { label: "Offer", tone: "neutral", verb: "offer of" },
  delisting: { label: "Delisted", tone: "neutral", verb: "delisted" },
};

const tierLabel = (stage: Stage) =>
  STAGES[stage].name.charAt(0) + STAGES[stage].name.slice(1).toLowerCase();

export function BlackMarketPanel() {
  const [filter, setFilter] = useState<MarketFilter>({ sort: "price-asc" });
  const filterActive = !!filter.stage || !!filter.lpOnly || !!filter.immolatedOnly;

  // Controlled tabs so a deep-link can open a specific one, e.g. the Vault's
  // "Sell" button navigates to { building: "market", tab: "yours" }.
  const [active, setActive] = useState("listings");
  const { pending, clearPending } = useNavigation();
  useEffect(() => {
    if (pending?.building !== "market") return;
    const t = pending.tab;
    if (t === "yours" || t === "listings" || t === "activity") setActive(t);
    clearPending();
  }, [pending, clearPending]);

  const TABS: { id: string; label: string; art: ImageButtonName }[] = [
    { id: "listings", label: "Listings", art: "listings" },
    { id: "activity", label: "Recent activity", art: "recentactive" },
    { id: "yours", label: "Your Acolyte", art: "youracolyte" },
  ];

  return (
    <Panel title="The Black Market" tagline="Buy & sell Acolytes" frame="forged" bg="stone">
      {/* Designer image tabs (baked-in labels), centered and capped so they don't
          balloon in the wide panel. Active stays lit; the rest fade and light on
          hover. This whole header stays put while the grid scrolls below it. */}
      <div role="tablist" className="mx-auto mb-4 grid max-w-lg grid-cols-3 gap-2">
        {TABS.map((t) => {
          const on = active === t.id;
          return (
            <div key={t.id} className="flex flex-col items-center">
              <ImageButton
                name={t.art}
                label={t.label}
                width="100%"
                dim={!on}
                onClick={() => setActive(t.id)}
              />
              {/* The designer marks the open tab with a lit gold rule under the
                  plate (not a red glow), so the ornate plate art stays intact. */}
              <span
                aria-hidden
                className={`mt-1 h-[3px] w-3/5 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-fast ${
                  on ? "opacity-100 shadow-[0_0_8px_rgba(240,169,59,0.6)]" : "opacity-0"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* The tier/variant filter drives the market tabs, not your own single
          Acolyte, so hide it on the "Your Acolyte" tab. */}
      {active !== "yours" && <FilterBar filter={filter} setFilter={setFilter} />}

      {active === "listings" && (
        <ListingsTab filter={filter} setFilter={setFilter} filterActive={filterActive} />
      )}
      {active === "activity" && <ActivityTab filter={filter} filterActive={filterActive} />}
      {active === "yours" && <YourAcolyteTab />}
    </Panel>
  );
}

/* --- Shared filter bar: tier + variant. Drives both tabs. ---------------- */
function FilterBar({
  filter,
  setFilter,
}: {
  filter: MarketFilter;
  setFilter: (f: MarketFilter) => void;
}) {
  const setTier = (stage?: Stage) => setFilter({ ...filter, stage });
  const toggle = (key: "lpOnly" | "immolatedOnly") =>
    setFilter({ ...filter, [key]: !filter[key] });

  return (
    <div className="orn-box mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {/* Tier (Acolyte stage). Each chip carries its tier crest so the filter and
          the artwork read as one family. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-3 text-[10px] uppercase tracking-widest">Tier</span>
        <Chip active={!filter.stage} onClick={() => setTier(undefined)}>
          All
        </Chip>
        {TIERS.map((s) => (
          <Chip
            key={s}
            active={filter.stage === s}
            ariaLabel={`Filter: ${tierLabel(s)} tier`}
            onClick={() => setTier(filter.stage === s ? undefined : s)}
          >
            <GameIcon name={tierCrest(s)} size={16} />
            {tierLabel(s)}
            <span className="text-[10px] opacity-70">{STAGES[s].multiplier}×</span>
          </Chip>
        ))}
      </div>

      <span className="hidden h-6 w-px bg-frame/30 sm:block" aria-hidden />

      {/* Variant traits (combine with any tier). Same forged chip family as the
          tiers, so the whole bar reads as one control (matching the mockup). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-3 text-[10px] uppercase tracking-widest">Variant</span>
        <Chip active={!!filter.lpOnly} onClick={() => toggle("lpOnly")}>
          LP variant
        </Chip>
        <Chip active={!!filter.immolatedOnly} onClick={() => toggle("immolatedOnly")}>
          Immolated
        </Chip>
      </div>
    </div>
  );
}

/* --- Listings tab: sort row + count + grid ------------------------------- */
function ListingsTab({
  filter,
  setFilter,
  filterActive,
}: {
  filter: MarketFilter;
  setFilter: (f: MarketFilter) => void;
  filterActive: boolean;
}) {
  const listings = useMarketListings(filter);

  return (
    <StateView query={listings} loading={<MarketGridSkeleton />}>
      {(rows) =>
        rows.length === 0 ? (
          filterActive ? (
            <EmptyState
              icon="🜂"
              title="No Acolytes match"
              message="Nothing matches this filter yet. Try a different filter, or create your own in The Forge."
              action={
                <NavCta to="forge" tab="burn" className="">
                  Create an Acolyte
                </NavCta>
              }
            />
          ) : (
            <EmptyState
              icon="🜂"
              title="No Acolytes listed yet"
              message="Acolytes show up here once people start burning $PYRE. Be the first to create one."
              action={
                <NavCta to="forge" tab="burn" className="">
                  Create the first Acolyte
                </NavCta>
              }
            />
          )
        ) : (
          <div>
            {/* Collection stats bar (floor / listed) — the "market pulse" every NFT
                marketplace opens with, computed from the live listings. */}
            <MarketStats rows={rows} />

            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span className="text-text-3">
                {rows.length} {rows.length === 1 ? "Acolyte" : "Acolytes"} listed
              </span>
              <SortSelect filter={filter} setFilter={setFilter} />
            </div>

            {/* The grid scrolls inside its own bounded area, so the header + filters
                stay pinned and the panel keeps to one screen (no shrink-to-fit). */}
            <div className="market-scroll max-h-[52vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {rows.map((l) => {
                  const acolyte = acolyteFromMarket(l);
                  return (
                    <a
                      key={l.tokenId}
                      href={l.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-lg border border-frame/35 bg-gradient-to-b from-surface-2/25 to-black/40 shadow-[inset_0_1px_0_rgba(255,214,150,0.05)] transition-all duration-fast hover:border-brand/70 hover:shadow-[inset_0_1px_0_rgba(255,214,150,0.08),0_0_18px_-6px_rgba(240,169,59,0.55)]"
                    >
                      {/* Art tile with the tier + variant badges overlaid on it.
                          `bare` art: the card owns the badges, so the art skips its
                          own to avoid doubling them. */}
                      <div className="relative grid aspect-square place-items-center bg-gradient-to-b from-black/10 to-black/40">
                        <AcolyteArt acolyte={acolyte} size={168} bare />
                        <span className="absolute left-1.5 top-1.5">
                          <Badge tone="brand">{tierLabel(l.stage)}</Badge>
                        </span>
                        {(l.isLP || l.isImmolated) && (
                          <span className="absolute right-1.5 top-1.5 flex gap-1">
                            {l.isLP && <Badge tone="brand">LP</Badge>}
                            {l.isImmolated && <Badge tone="danger">Immolated</Badge>}
                          </span>
                        )}
                        {/* Hover "buy" affordance, marketplace convention. */}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-brand/90 py-1.5 text-center text-xs font-medium text-bg transition-transform duration-fast group-hover:translate-y-0">
                          Buy on the market →
                        </span>
                      </div>
                      {/* Price is the loudest thing on the card; id + yield + age support it. */}
                      <div className="space-y-0.5 px-2.5 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="tabular text-base font-semibold text-text">
                            {formatEth(l.priceEth)}
                          </span>
                          <span className="tabular text-[10px] text-text-3">#{l.tokenId}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-3">
                          <span>{l.multiplier}× yield</span>
                          <span>{formatAgo(l.listedAt)}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )
      }
    </StateView>
  );
}

/* Sort: the themed Select (a forged trigger + carved popover), so it keeps the
   theme where a native <select> would punch an OS-grey hole through the panel. */
function SortSelect({
  filter,
  setFilter,
}: {
  filter: MarketFilter;
  setFilter: (f: MarketFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-text-3">
      <span>Sort</span>
      <Select<MarketSort>
        ariaLabel="Sort listings"
        value={filter.sort ?? "price-asc"}
        options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
        onChange={(sort) => setFilter({ ...filter, sort })}
      />
    </div>
  );
}

/* Loading grid: carved tiles that pulse while the listings load, so the market
   opens as a filling hall, not a flash of empty space. */
function MarketGridSkeleton() {
  return (
    <div>
      <div className="orn-box !p-0 mb-3 grid grid-cols-3 divide-x divide-frame/25 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-3 py-2.5 text-center">
            <Skeleton className="mx-auto h-2.5 w-10" />
            <Skeleton className="mx-auto mt-1.5 h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-frame/25 bg-black/30">
            <Skeleton className="aspect-square w-full !rounded-none" />
            <div className="space-y-1.5 px-2.5 py-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Recent activity tab: the live event stream ------------------------- */
function ActivityTab({ filter, filterActive }: { filter: MarketFilter; filterActive: boolean }) {
  // Activity is always newest-first; sort doesn't apply, so drop it from the key.
  const { stage, lpOnly, immolatedOnly } = filter;
  const activity = useMarketActivity({ stage, lpOnly, immolatedOnly });

  return (
    <StateView query={activity}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState
            icon="🜂"
            title={filterActive ? "No matching trades" : "No trades yet"}
            message={
              filterActive
                ? "No market moves fit this filter yet. The feed fills as Acolytes change hands."
                : "The Acolyte market is silent. Every sale, listing and offer will scroll here once the burning begins."
            }
          />
        ) : (
          <ul className="divide-y divide-surface-3/50">
            {rows.map((e) => {
              const meta = ACTIVITY_META[e.kind];
              const acolyte = acolyteFromMarket(e);
              return (
                <li key={e.id}>
                  <a
                    href={e.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 py-2.5 hover:bg-surface-2 -mx-2 px-2 rounded-md transition-colors duration-fast"
                  >
                    <div className="shrink-0">
                      <AcolyteArt acolyte={acolyte} size={40} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-text text-sm truncate">
                          {tierLabel(e.stage)} Acolyte{" "}
                          <span className="text-text-3 tabular">#{e.tokenId}</span>
                        </span>
                      </div>
                      <div className="text-text-3 text-[11px] mt-0.5 truncate">
                        {e.kind === "sale" && e.to
                          ? `${shortAddress(e.from)} → ${shortAddress(e.to)}`
                          : `by ${shortAddress(e.from)}`}
                        {e.isLP && " · LP"}
                        {e.isImmolated && " · Immolated"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-text text-sm">
                        {e.kind === "delisting" ? "n/a" : formatEth(e.priceEth)}
                      </div>
                      <div className="text-text-3 text-[11px]">{formatAgo(e.at)}</div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )
      }
    </StateView>
  );
}

/* --- Your Acolyte tab: view the Acolyte you own + list it for sale -------
   Each wallet forges a single Acolyte, so this shows yours (if any) with a
   link out to list it on the wrapped marketplace. */
function YourAcolyteTab() {
  const acolyte = useAcolyte();
  return (
    <RequireWallet message="Connect your wallet to see the Acolyte you own.">
      <StateView query={acolyte}>
        {(a) =>
          !a.exists ? (
            <EmptyState
              icon="🜂"
              title="You have no Acolyte to sell yet"
              message="You haven't forged an Acolyte. Burn $PYRE in The Forge to create one, then you can list it for sale here."
              action={
                <NavCta to="forge" tab="burn" className="">
                  Forge an Acolyte
                </NavCta>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                <AcolyteArt acolyte={a} size={132} />
                <div className="space-y-2">
                  <div>
                    <span className="font-display text-2xl text-brand">{acolyteName(a.stage)}</span>
                    {a.tokenId != null && (
                      <span className="text-text-3 tabular ml-2">#{a.tokenId}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge tone="brand">{a.multiplier}× yield</Badge>
                    {a.isLP && <Badge tone="brand">LP variant</Badge>}
                    {a.isImmolated && <Badge tone="danger">Immolated</Badge>}
                  </div>
                  <Stat label="Cumulative burned" value={formatToken(a.cumulativeBurnWeight)} />
                </div>
              </div>

              <div className="orn-box space-y-3">
                <p className="text-text-2 text-sm">
                  PYRE doesn&rsquo;t custody your Acolyte. Listing opens on OpenSea, where the sale
                  settles, and your listing then shows up in the Listings tab here.
                </p>
                <a
                  href={MARKETPLACE_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Sell on the Black Market (opens OpenSea)"
                  className="group block"
                >
                  <ImageArt name="sellblackmarket" width="100%" className="group-hover:hidden" />
                  <ImageArt name="sellblackmarket" width="100%" hover className="hidden group-hover:block" />
                </a>
              </div>
            </div>
          )
        }
      </StateView>
    </RequireWallet>
  );
}

/* Build the minimal Acolyte the art component needs from a listing/event. */
function acolyteFromMarket(m: {
  tokenId: number;
  stage: Stage;
  stageName: string;
  multiplier: number;
  isLP: boolean;
  isImmolated: boolean;
  svg: string | null;
}): Acolyte {
  return {
    exists: true,
    tokenId: m.tokenId,
    stage: m.stage,
    stageName: m.stageName,
    multiplier: m.multiplier,
    cumulativeBurnWeight: 0n,
    nextStageThreshold: null,
    isLP: m.isLP,
    isImmolated: m.isImmolated,
    seed: null,
    svg: m.svg,
  };
}

/* --- Collection stats: the market pulse (floor / listed / best yield) -----
   Computed from the live listings so it's always honest, no separate feed. The
   opening glance every NFT marketplace gives you before you scroll the grid. */
function MarketStats({
  rows,
}: {
  rows: { priceEth: bigint; multiplier: number }[];
}) {
  if (rows.length === 0) return null;
  const floor = rows.reduce((m, r) => (r.priceEth < m ? r.priceEth : m), rows[0].priceEth);
  const topYield = rows.reduce((m, r) => Math.max(m, r.multiplier), 0);
  const cells: { label: string; value: string }[] = [
    { label: "Floor", value: formatEth(floor) },
    { label: "Listed", value: String(rows.length) },
    { label: "Best yield", value: `${topYield}×` },
  ];
  return (
    <div className="orn-box !p-0 mb-3 grid grid-cols-3 divide-x divide-frame/25 overflow-hidden">
      {cells.map((c) => (
        <div key={c.label} className="px-3 py-2 text-center">
          <div className="text-text-3 text-[10px] uppercase tracking-widest">{c.label}</div>
          <div className="tabular text-brand text-sm mt-0.5">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

