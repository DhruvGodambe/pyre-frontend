"use client";

/* DEV-ONLY: a bench for the Emberkeeper's dialogue chrome (KeeperBox family).
   Renders the box in its real states without walking the tour or the front
   door, so the look can be checked (and screenshotted headlessly) in one
   glance. Returns 404 in production. */

import { notFound } from "next/navigation";
import { KeeperBox, KeeperText, PlateButton } from "@/components/ui/keeper-box";
import { Panel, ProgressBar } from "@/components/ui/primitives";
import { asset } from "@/lib/config";

const LONG =
  "Welcome to Pyre. I'm the Emberkeeper: I tend the flame at the heart of this kingdom and guide every newcomer through it. The idea here is simple: stake $PYRE to earn $ETH yield, then burn it to forge an Acolyte NFT that multiplies what you earn.";
const SHORT =
  "Welcome, stranger. The gate is currently closed.\nYou might want to study the Ember Codex while you wait.";

function Portrait() {
  return (
    <img
      src={asset("/world/emberkeeper/arm-out.webp")}
      alt=""
      draggable={false}
      className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-md object-cover object-top ring-1 ring-black/70 shadow-[0_2px_10px_rgba(0,0,0,0.6)] select-none"
      aria-hidden
    />
  );
}

export default function KeeperPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-[#1a221a] flex flex-col items-center gap-16 py-16 px-4">
      {/* Tour shape: controls row, header, long text mid-reveal, one plate. */}
      <KeeperBox
        className="w-full max-w-xl shadow-panel"
        actions={<PlateButton label="Begin the tour" />}
      >
        <div className="flex items-center gap-4">
          <Portrait />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-end gap-3 text-text-3 text-[11px]">
              <span>1x</span>
              <span>mute</span>
              <span>skip</span>
            </div>
            <div className="mb-0.5 text-text-3 text-[10px] uppercase tracking-widest">
              The Pyre Kingdom
            </div>
            <KeeperText text={LONG} shown={Math.floor(LONG.length * 0.62)} lines={3} />
          </div>
        </div>
      </KeeperBox>

      {/* Front-door shape: short text done, two plates, one locked. */}
      <KeeperBox
        className="w-full max-w-2xl shadow-panel"
        actions={
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-3">
            <PlateButton label="Enter Pyre" locked />
            <PlateButton label="Read the Codex" />
          </div>
        }
      >
        <div className="flex items-center gap-4">
          <Portrait />
          <div className="min-w-0 flex-1">
            <KeeperText text={SHORT} shown={SHORT.length} lines={3} />
          </div>
        </div>
      </KeeperBox>

      {/* FORGED PANEL PILOT (Ashen Cup language test): the keeper box chrome
          carrying an in-kingdom panel. Static stand-in content, the real
          Quests box needs live providers. */}
      <div className="w-full max-w-4xl grid gap-8 items-start lg:grid-cols-3">
        <Panel title="Quests" tagline="Complete tasks to earn Points" className="lg:col-span-2" frame="forged">
          <div className="space-y-4">
            <div className="rounded-md border border-brand/30 bg-brand/[0.06] px-3 py-2.5 text-xs leading-relaxed text-text-2">
              <span className="text-brand">⚠ 260 Points</span> still unclaimed. Rewards are revealed at launch.
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 border border-surface-3/60">
              <span className="text-text-3 text-xs uppercase tracking-wider">Points earned</span>
              <span className="tabular text-brand text-lg">140</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 uppercase tracking-wider">Your quests</span>
                <span className="tabular text-text-2">2 of 6 done</span>
              </div>
              <ProgressBar value={2 / 6} />
            </div>
            <div className="rounded-md border border-brand/40 bg-brand/[0.06] px-3 py-2.5">
              <div className="text-text-3 text-[10px] uppercase tracking-widest">Quest 3 of 6</div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="text-sm text-text">Follow Pyre on X</span>
                <span className="tabular shrink-0 text-xs text-text-3">+40</span>
              </div>
              <p className="mt-0.5 text-text-3 text-xs">Open the profile and follow. Come back and it counts.</p>
            </div>
            <div className="rounded-md bg-surface-2 px-3 py-2.5 opacity-70">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-3 line-through">Take the tour</span>
                <span className="tabular shrink-0 text-xs text-success">✓ 60</span>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Leaderboard" tagline="Top point earners" frame="forged">
          <ol className="space-y-1">
            {[
              ["Emberhand", 940],
              ["ashen_kate", 720],
              ["0xFlame", 615],
            ].map(([name, pts], i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm bg-surface-2">
                <span className="text-text-2 tabular">#{i + 1} {name}</span>
                <span className="tabular text-brand shrink-0">{pts}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* Phone width: the narrowest real case. */}
      <div className="w-[358px]">
        <KeeperBox
          className="w-full shadow-panel"
          actions={
            <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-3">
              <PlateButton label="Enter Pyre" />
              <PlateButton label="Read the Codex" />
            </div>
          }
        >
          <div className="flex items-center gap-3">
            <Portrait />
            <div className="min-w-0 flex-1">
              <KeeperText text={SHORT} shown={SHORT.length} lines={3} />
            </div>
          </div>
        </KeeperBox>
      </div>
    </div>
  );
}
