"use client";

/* DEV-ONLY: a bench for the Emberkeeper's dialogue chrome (KeeperBox family).
   Renders the box in its real states without walking the tour or the front
   door, so the look can be checked (and screenshotted headlessly) in one
   glance. Returns 404 in production. */

import { notFound } from "next/navigation";
import { KeeperBox, KeeperText, PlateButton } from "@/components/ui/keeper-box";
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
