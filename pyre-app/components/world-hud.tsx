"use client";

/* WORLD HUD, the always-on overlay once the village is awake.
   - RiteProgress (top-right): how far through the rites you are + Embers, a live
     reminder of the unfinished journey (Zeigarnik) that opens the Tavern.
   - Profile (bottom-left): who you are, avatar + wallet address or guest name.
   - EmberCount: a count-up so Embers visibly TICK when a rite completes.

   Reads the same quest/referral/identity data the Tavern does, so the numbers
   are always in sync. Gated by the caller on `awake` (identity set). */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/config";
import {
  useQuestTasks,
  useReferral,
  useStakingPosition,
  useImmolatedPosition,
  useAcolyte,
} from "@/lib/hooks";
import { useIdentity } from "@/lib/identity";
import { useWallet } from "@/lib/wallet";
import { useNavigation } from "@/lib/navigation";
import { AcolyteAvatar } from "@/components/ui/acolyte-art";
import { GameIcon, tierCrest, type GameIconName } from "@/components/ui/game-icon";
import type { Stage } from "@/lib/constants";
import {
  shortAddress,
  formatEth,
  formatToken,
  formatCountdown,
  toNumber,
} from "@/lib/format";
import type { Address } from "@/lib/types";

/* Animated whole-number count-up. Ticks from the previous value to the new one
   over ~600ms whenever `value` changes (e.g. Embers after a rite completes). */
export function EmberCount({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let raf = 0;
    let start: number | null = null;
    const dur = 600;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular">{shown}</span>;
}

/* Total Embers = rites completed + referral earnings (matches the Tavern). */
function useEmbers() {
  const tasks = useQuestTasks();
  const referral = useReferral();
  const rows = tasks.data ?? [];
  const total = rows.length;
  const done = rows.filter((t) => t.done).length;
  const questEmbers = rows.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
  const refEmbers = referral.data ? referral.data.count * referral.data.embersEach : 0;
  return { ready: !!tasks.data, total, done, embers: questEmbers + refEmbers };
}

/* TOP-RIGHT, rite progress + Embers, opens the Tavern rites on click. */
export function WorldRiteProgress() {
  const { ready, total, done, embers } = useEmbers();
  const { navigate } = useNavigation();
  if (!ready || total === 0) return null;
  const pct = done / total;
  const complete = done === total;
  return (
    <button
      onClick={() => navigate({ building: "tavern", tab: "rites" })}
      title="Your quests, open the Ashen Cup"
      className="group flex items-center gap-2.5 rounded-full border border-surface-3/60 bg-surface/85 px-3 py-1.5 shadow-panel backdrop-blur transition-colors hover:border-brand"
    >
      <span className="text-text-3 text-[10px] uppercase tracking-wider">Quests</span>
      <span className="tabular text-sm text-text">
        {done}
        <span className="text-text-3">/{total}</span>
      </span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-3">
        <span
          className="block h-full rounded-full bg-brand transition-all duration-base"
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="flex items-center gap-1.5 text-sm text-brand">
        <GameIcon name="emberCrystal" size={16} /> <EmberCount value={embers} />
      </span>
      {complete && <span className="text-success text-xs">✓</span>}
    </button>
  );
}

/* A deterministic avatar gradient from a seed (placeholder until the Acolyte PFP
   art lands, see [[nft-art]]). Same seed → same colours every visit. */
function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 68% 55%), hsl(${(h + 48) % 360} 70% 45%))`;
}

/* The identity pill, avatar + name. Static on its own (WorldProfile) or used as
   the toggle for the standing ledger (WorldLedger), with a trailing caret. */
function ProfilePill({
  onClick,
  trailing,
}: {
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const { mode, address, username } = useIdentity();
  if (!mode) return null;
  const label =
    mode === "wallet" && address ? shortAddress(address as Address) : username ?? "Guest";
  const seed = (mode === "wallet" ? address : username) ?? "stranger";
  const initial = (username ?? address ?? "?").replace(/^0x/i, "").charAt(0).toUpperCase();
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-full border border-surface-3/60 bg-surface/85 py-1.5 pl-1.5 pr-3.5 shadow-panel backdrop-blur ${
        onClick ? "transition-colors hover:border-brand" : ""
      }`}
    >
      <span
        className="grid h-7 w-7 place-items-center rounded-full text-xs font-medium text-bg"
        style={{ background: avatarGradient(seed) }}
        aria-hidden
      >
        {initial}
      </span>
      <div className="leading-tight text-left">
        <div className="tabular text-xs text-text">{label}</div>
        <div className="text-[10px] text-text-3">{mode === "wallet" ? "Connected" : "Guest"}</div>
      </div>
      {trailing}
    </Tag>
  );
}

/* BOTTOM-LEFT, who you are. Wallet → short 0x address; guest → chosen name. */
export function WorldProfile() {
  return <ProfilePill />;
}

/* A value that re-renders every second while `active`, for live countdowns. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/* One reminder line in the standing dossier: a designer crest, a label, and the
   value (with an optional sub). Clickable rows deep-link into a building and
   reveal a trailing caret on hover. `live` marks a value worth acting on now
   (claimable yield) with a pulsing ember dot. */
function LedgerRow({
  icon,
  label,
  value,
  sub,
  accent = false,
  live = false,
  onClick,
}: {
  icon: GameIconName;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  live?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 py-2 text-left"
    >
      <GameIcon
        name={icon}
        size={20}
        className="shrink-0 opacity-90 transition-opacity group-hover:opacity-100"
      />
      <span className="flex-1 text-text-3 text-[11px] uppercase tracking-wider transition-colors group-hover:text-text-2">
        {label}
      </span>
      {live && <span className="ember-dot shrink-0" aria-hidden />}
      <span className="text-right leading-tight">
        <span className={`tabular block text-sm ${accent ? "text-brand" : "text-text"}`}>
          {value}
        </span>
        {sub && <span className="block text-[10px] text-text-3">{sub}</span>}
      </span>
      <span
        className={`w-2 text-text-3 text-sm transition-colors group-hover:text-brand ${
          onClick ? "" : "opacity-0"
        }`}
        aria-hidden
      >
        ›
      </span>
    </Tag>
  );
}

/* The "most important things" reminders. Rites work for everyone (incl. guests);
   yield / drip / Acolyte / staked need a connected wallet. */
function LedgerBody() {
  const { status } = useWallet();
  const connected = status === "connected";
  const staking = useStakingPosition();
  const immolated = useImmolatedPosition();
  const acolyte = useAcolyte();
  const referral = useReferral();
  const { ready, total, done, embers } = useEmbers();
  const { navigate } = useNavigation();
  const ref = referral.data;

  const p = staking.data;
  const claimable =
    (p?.pendingRewardsEth ?? 0n) + (immolated.data?.pendingYieldEth ?? 0n);
  const drip = p?.drip ?? null;
  const boost = p?.boost ?? null;
  const a = acolyte.data;
  const now = useNow(!!drip || !!boost);

  return (
    <div className="divide-y divide-frame/15">
      {ready && total > 0 && (
        <LedgerRow
          icon="quest"
          label="Quests"
          value={`${done}/${total}`}
          sub={
            <span className="inline-flex items-center gap-1">
              <GameIcon name="emberCrystal" size={11} /> {embers} Points
            </span>
          }
          accent={done === total}
          onClick={() => navigate({ building: "tavern", tab: "rites" })}
        />
      )}

      {ref && (
        <LedgerRow
          icon="guest"
          label="Friends referred"
          value={ref.count}
          sub={
            ref.count > 0 ? `${ref.count * ref.embersEach} Points earned` : "invite to earn Points"
          }
          onClick={() => navigate({ building: "tavern", tab: "summon" })}
        />
      )}

      {connected && (
        <>
          <LedgerRow
            icon="reward"
            label="Claimable yield"
            value={formatEth(claimable)}
            accent={claimable > 0n}
            live={claimable > 0n}
            sub={claimable > 0n ? "ready to claim" : "nothing pending"}
            onClick={() => navigate({ building: "vault" })}
          />

          {drip && (
            <LedgerRow
              icon="time"
              label="Drip returns in"
              value={formatCountdown(drip.completeAt - now)}
              sub={`${formatToken(drip.claimable)} claimable now`}
              onClick={() => navigate({ building: "forge", tab: "stake" })}
            />
          )}

          {/* The Acolyte's tier lives in the hero above; here we only nudge the
              unforged toward the Forge. */}
          {!a?.exists && (
            <LedgerRow
              icon="flame"
              label="Acolyte"
              value="Not forged"
              sub={
                a && a.cumulativeBurnWeight > 0n
                  ? `${formatToken(a.cumulativeBurnWeight)} burned so far`
                  : "burn $PYRE to forge one"
              }
              onClick={() => navigate({ building: "forge", tab: "burn" })}
            />
          )}

          <LedgerRow
            icon="fireToken"
            label="Staked"
            value={formatToken(p?.stakedBalance ?? 0n)}
            sub={
              boost
                ? `+${Math.round((boost.factor - 1) * 100)}% boost · ${formatCountdown(boost.expiresAt - now)} left`
                : "shielded from decay"
            }
            onClick={() => navigate({ building: "forge", tab: "stake" })}
          />
        </>
      )}
    </div>
  );
}

/* TOP-RIGHT, the personal "Your standing" panel: one box carrying the identity
   (with disconnect) and the handful of numbers that matter most, each a shortcut
   into the building that acts on it. Replaces the separate wallet chip + rite
   pill so nothing is doubled. The detailed view still lives in the Amber Vault. */
/* Each Acolyte tier glows in its own colour, so the whole card is tinted by the
   stage you've forged to (deep red Ember → pale gold Pyre). */
const STAGE_TIER_COLOR: Record<Stage, string> = {
  1: "var(--color-stage-ember)",
  2: "var(--color-stage-flame)",
  3: "var(--color-stage-forge)",
  4: "var(--color-stage-pyre)",
};

export function WorldLedger() {
  const { mode, address, username } = useIdentity();
  const { status, disconnect } = useWallet();
  const acolyte = useAcolyte();
  if (!mode) return null;
  const a = acolyte.data;
  const forged = !!a?.exists;
  const label =
    mode === "wallet" && address ? shortAddress(address as Address) : username ?? "Guest";

  // The card's accent = the Acolyte's tier colour (brand gold before forging).
  const tier = forged ? STAGE_TIER_COLOR[a!.stage] : "var(--color-brand)";
  const role = forged ? `${a!.stageName} Acolyte` : mode === "wallet" ? "Connected" : "Guest";
  const maxTier = forged && !a!.nextStageThreshold;
  const tierPct =
    forged && a!.nextStageThreshold
      ? Math.min(99, Math.round((toNumber(a!.cumulativeBurnWeight) / toNumber(a!.nextStageThreshold)) * 100))
      : 100;

  return (
    <div
      className="profile-card w-80 max-w-[calc(100vw-2rem)] p-4"
      style={{ "--tier": tier } as React.CSSProperties}
    >
      {/* Hero: portrait + crest, identity, and the multiplier as the headline. */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="profile-portrait">
            {forged ? (
              <AcolyteAvatar acolyte={a!} size={54} />
            ) : (
              // No Acolyte forged yet: the Pyre emblem is the default sigil-PFP,
              // sitting on a dark forge niche until the visitor forges their own.
              <span
                className="grid h-[54px] w-[54px] place-items-center overflow-hidden rounded-[11px]"
                style={{ background: "radial-gradient(circle at 50% 38%, #241a12, #0c0805)" }}
                aria-hidden
              >
                <Image
                  src={asset("/world/ui/pyre-emblem.webp")}
                  alt=""
                  width={46}
                  height={46}
                  className="select-none object-contain"
                  draggable={false}
                />
              </span>
            )}
          </div>
          {forged && (
            <span className="absolute -bottom-2 -right-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              <GameIcon name={tierCrest(a!.stage, a!.isImmolated)} size={28} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="tabular truncate text-sm text-text">{label}</span>
            {status === "connected" && (
              <button
                onClick={disconnect}
                title="Disconnect"
                className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-text-3 transition-colors hover:text-danger"
              >
                Disconnect
              </button>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="font-display text-lg leading-none"
              style={{ color: forged ? tier : "var(--color-text-2)" }}
            >
              {role}
            </span>
            {forged && (
              <span
                className="tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                style={{
                  color: tier,
                  background: "color-mix(in srgb, var(--tier) 16%, transparent)",
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--tier) 45%, transparent)",
                }}
              >
                {a!.multiplier}× yield
              </span>
            )}
          </div>

          {/* Tier progress rail (how close to the next crest). */}
          {forged && (
            <div className="mt-2">
              <div className="tier-rail">
                <span style={{ width: `${maxTier ? 100 : tierPct}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-text-3">
                {maxTier ? "Max tier reached" : `${tierPct}% to the next tier`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* The standing: the handful of numbers that matter, each a shortcut. */}
      <div className="mt-3 border-t border-frame/20 pt-1">
        <LedgerBody />
      </div>
    </div>
  );
}
