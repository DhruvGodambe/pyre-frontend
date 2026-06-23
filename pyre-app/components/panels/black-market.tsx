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
import { Panel, Badge, Stat } from "@/components/ui/primitives";
import { StateView, EmptyState } from "@/components/ui/state";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { Tabs } from "@/components/ui/tabs";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { formatEth, formatAgo, shortAddress, formatToken } from "@/lib/format";
import { STAGES, acolyteName, type Stage } from "@/lib/constants";
import type { MarketFilter, MarketSort } from "@/lib/datasource";
import type { Acolyte, MarketActivityKind } from "@/lib/types";

/* The Black Market is a branded window over OpenSea/Blur (no PYRE listing
   contract), so listing your own Acolyte links out to the marketplace, where
   the trade actually settles. */
const MARKETPLACE_URL = "https://opensea.io/";

/* Tier accent colours, same tokens the Acolyte art uses, so the filter chips and
   the artwork read as one system once the designer's palette lands. */
const STAGE_COLOR: Record<Stage, string> = {
  1: "var(--color-stage-ember)",
  2: "var(--color-stage-flame)",
  3: "var(--color-stage-forge)",
  4: "var(--color-stage-pyre)",
};

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

  const tabs = [
    {
      id: "listings",
      label: "Listings",
      content: <ListingsTab filter={filter} setFilter={setFilter} filterActive={filterActive} />,
    },
    {
      id: "activity",
      label: "Recent activity",
      content: <ActivityTab filter={filter} filterActive={filterActive} />,
    },
    {
      id: "yours",
      label: "Your Acolyte",
      content: <YourAcolyteTab />,
    },
  ];

  return (
    <Panel title="The Black Market" tagline="Buy & sell Acolytes">
      {/* The tier/variant filter drives the market tabs, not your own single
          Acolyte, so hide it on the "Your Acolyte" tab. */}
      {active !== "yours" && <FilterBar filter={filter} setFilter={setFilter} />}
      <Tabs tabs={tabs} active={active} onChange={setActive} />
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
    <div className="mb-4 space-y-2">
      {/* Tier (Acolyte stage) */}
      <div>
        <span className="text-text-3 text-[10px] uppercase tracking-widest">Tier</span>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <Chip active={!filter.stage} onClick={() => setTier(undefined)}>
            All tiers
          </Chip>
          {TIERS.map((s) => (
            <Chip
              key={s}
              active={filter.stage === s}
              color={STAGE_COLOR[s]}
              onClick={() => setTier(filter.stage === s ? undefined : s)}
            >
              {tierLabel(s)}
              <span className="ml-1 text-[10px] opacity-70">{STAGES[s].multiplier}×</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* Variant traits (combine with any tier) */}
      <div>
        <span className="text-text-3 text-[10px] uppercase tracking-widest">Variant</span>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <Chip active={!!filter.lpOnly} onClick={() => toggle("lpOnly")}>
            LP variant
          </Chip>
          <Chip active={!!filter.immolatedOnly} onClick={() => toggle("immolatedOnly")}>
            Immolated
          </Chip>
        </div>
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
    <StateView query={listings}>
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
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-text-3">
                {rows.length} {rows.length === 1 ? "Acolyte" : "Acolytes"} listed
              </span>
              <SortSelect filter={filter} setFilter={setFilter} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {rows.map((l) => {
                const acolyte = acolyteFromMarket(l);
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
                      <Badge tone="brand">{tierLabel(l.stage)}</Badge>
                      <span className="tabular text-text text-sm">{formatEth(l.priceEth)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-text-3">
                      <span>{l.multiplier}× yield</span>
                      <span>{formatAgo(l.listedAt)}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )
      }
    </StateView>
  );
}

/* The sort control is a plain native <select> for now (the designer styles the
   real control later); it writes `sort` onto the shared filter. */
function SortSelect({
  filter,
  setFilter,
}: {
  filter: MarketFilter;
  setFilter: (f: MarketFilter) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-text-3">
      <span>Sort</span>
      <select
        value={filter.sort ?? "price-asc"}
        onChange={(e) => setFilter({ ...filter, sort: e.target.value as MarketSort })}
        className="rounded-sm bg-surface-2 border border-surface-3 px-2 py-1 text-text-2 text-xs outline-none focus:border-brand/60"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
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

              <div className="rounded-md bg-surface-2 border border-surface-3/60 p-4 space-y-3">
                <p className="text-text-2 text-sm">
                  PYRE doesn&rsquo;t custody your Acolyte. Listing opens on OpenSea, where the sale
                  settles, and your listing then shows up in the Listings tab here.
                </p>
                <a
                  href={MARKETPLACE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-md bg-brand text-bg px-4 py-2.5 text-center text-sm font-medium transition-colors duration-fast hover:bg-brand-deep"
                >
                  List for sale on OpenSea →
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

/* --- Filter / sort chip -------------------------------------------------- */
function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs transition-colors duration-fast ${
        active ? "bg-brand text-bg" : "bg-surface-2 text-text-2 hover:text-text"
      }`}
    >
      {color && !active && (
        <span
          className="mr-1.5 h-2 w-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
