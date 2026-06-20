"use client";

/* WORLD HUD, the always-on overlay once the village is awake.
   - RiteProgress (top-right): how far through the rites you are + Embers, a live
     reminder of the unfinished journey (Zeigarnik) that opens the Tavern.
   - Profile (bottom-left): who you are, avatar + wallet address or guest name.
   - EmberCount: a count-up so Embers visibly TICK when a rite completes.

   Reads the same quest/referral/identity data the Tavern does, so the numbers
   are always in sync. Gated by the caller on `awake` (identity set). */

import { useEffect, useRef, useState } from "react";
import { useQuestTasks, useReferral } from "@/lib/hooks";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { shortAddress } from "@/lib/format";
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
      title="Your rites, open the Tavern"
      className="group flex items-center gap-2.5 rounded-full border border-surface-3/60 bg-surface/85 px-3 py-1.5 shadow-panel backdrop-blur transition-colors hover:border-brand"
    >
      <span className="text-text-3 text-[10px] uppercase tracking-wider">Rites</span>
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

/* BOTTOM-LEFT, who you are. Wallet → short 0x address; guest → chosen name. */
export function WorldProfile() {
  const { mode, address, username } = useIdentity();
  if (!mode) return null;
  const label =
    mode === "wallet" && address ? shortAddress(address as Address) : username ?? "Guest";
  const seed = (mode === "wallet" ? address : username) ?? "stranger";
  const initial = (username ?? address ?? "?").replace(/^0x/i, "").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-surface-3/60 bg-surface/85 py-1.5 pl-1.5 pr-3.5 shadow-panel backdrop-blur">
      <span
        className="grid h-7 w-7 place-items-center rounded-full text-xs font-medium text-bg"
        style={{ background: avatarGradient(seed) }}
        aria-hidden
      >
        {initial}
      </span>
      <div className="leading-tight">
        <div className="tabular text-xs text-text">{label}</div>
        <div className="text-[10px] text-text-3">{mode === "wallet" ? "Connected" : "Guest"}</div>
      </div>
    </div>
  );
}
