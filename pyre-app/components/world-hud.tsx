"use client";

/* WORLD HUD, the always-on overlay once the village is awake.
   - RiteProgress (top-right): how far through the rites you are + Embers, a live
     reminder of the unfinished journey (Zeigarnik) that opens the Tavern.
   - Profile (bottom-left): who you are, avatar + wallet address or guest name.
   - EmberCount: a count-up so Embers visibly TICK when a rite completes.

   Reads the same quest/referral/identity data the Tavern does, so the numbers
   are always in sync. Gated by the caller on `awake` (identity set). */

import { useEffect, useRef, useState } from "react";
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
      <span className="flex items-center gap-1 text-sm text-brand">
        🔥 <EmberCount value={embers} />
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

/* One reminder line in the ledger. Clickable rows deep-link into a building. */
function LedgerRow({
  label,
  value,
  sub,
  accent = false,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left ${
        onClick ? "hover:bg-surface-2" : ""
      }`}
    >
      <span className="text-text-3 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-right leading-tight">
          <span className={`tabular block text-sm ${accent ? "text-brand" : "text-text"}`}>
            {value}
          </span>
          {sub && <span className="block text-[10px] text-text-3">{sub}</span>}
        </span>
        {onClick && (
          <span className="text-text-3 text-sm transition-colors group-hover:text-brand">›</span>
        )}
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
  const { ready, total, done, embers } = useEmbers();
  const { navigate } = useNavigation();

  const p = staking.data;
  const claimable =
    (p?.pendingRewardsEth ?? 0n) + (immolated.data?.pendingYieldEth ?? 0n);
  const drip = p?.drip ?? null;
  const boost = p?.boost ?? null;
  const a = acolyte.data;
  const now = useNow(!!drip || !!boost);

  const tierPct =
    a?.exists && a.nextStageThreshold
      ? Math.min(99, Math.round((toNumber(a.cumulativeBurnWeight) / toNumber(a.nextStageThreshold)) * 100))
      : 100;

  return (
    <div className="space-y-0.5">
      {ready && total > 0 && (
        <LedgerRow
          label="Quests"
          value={`${done}/${total}`}
          sub={`🔥 ${embers} Embers`}
          accent={done === total}
          onClick={() => navigate({ building: "tavern", tab: "rites" })}
        />
      )}

      {connected && (
        <>
          <LedgerRow
            label="Claimable yield"
            value={formatEth(claimable)}
            accent={claimable > 0n}
            sub={claimable > 0n ? "ready to claim" : undefined}
            onClick={() => navigate({ building: "forge", tab: "stake" })}
          />

          {drip && (
            <LedgerRow
              label="Drip returns in"
              value={formatCountdown(drip.completeAt - now)}
              sub={`${formatToken(drip.claimable)} claimable now`}
              onClick={() => navigate({ building: "forge", tab: "stake" })}
            />
          )}

          {a?.exists ? (
            <LedgerRow
              label="Acolyte"
              value={`${a.stageName} · ${a.multiplier}×`}
              sub={`${formatToken(a.cumulativeBurnWeight)} burned · ${
                a.nextStageThreshold ? `${tierPct}% to next tier` : "max tier"
              }`}
              onClick={() => navigate({ building: "vault" })}
            />
          ) : (
            <LedgerRow
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
export function WorldLedger() {
  const { mode, address, username } = useIdentity();
  const { status, disconnect } = useWallet();
  const acolyte = useAcolyte();
  if (!mode) return null;
  const a = acolyte.data;
  const label =
    mode === "wallet" && address ? shortAddress(address as Address) : username ?? "Guest";
  const seed = (mode === "wallet" ? address : username) ?? "stranger";
  const initial = (username ?? address ?? "?").replace(/^0x/i, "").charAt(0).toUpperCase();
  return (
    <div className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-surface-3/60 bg-surface/90 shadow-panel backdrop-blur">
      {/* Identity + disconnect. The Acolyte NFT is the avatar once forged. */}
      <div className="flex items-center gap-2.5 border-b border-surface-3/50 px-3 py-2.5">
        {a?.exists ? (
          <AcolyteAvatar acolyte={a} size={36} />
        ) : (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-medium text-bg"
            style={{ background: avatarGradient(seed) }}
            aria-hidden
          >
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="tabular truncate text-xs text-text">{label}</div>
          <div className="text-[10px] text-text-3">
            {a?.exists ? `${a.stageName} Acolyte` : mode === "wallet" ? "Connected" : "Guest"}
          </div>
        </div>
        {status === "connected" && (
          <button
            onClick={disconnect}
            className="shrink-0 px-1.5 py-1 text-[10px] uppercase tracking-wider text-text-3 transition-colors hover:text-danger"
          >
            Disconnect
          </button>
        )}
      </div>
      {/* The reminders */}
      <div className="px-2 py-1.5">
        <div className="px-2.5 pb-1 pt-1 font-display text-sm text-brand">Your standing</div>
        <LedgerBody />
      </div>
    </div>
  );
}
