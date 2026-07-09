"use client";

/* MUTE BUTTON, the designer's engraved speaker icon (audio_on / audio_off).

   Unlike ImageButton (which swaps normal↔hover art), the mute icon swaps on
   STATE: audio_on when playing, audio_off (red X) when muted, with a small
   hover lift. Reads the shared world-mute state so it stays in lockstep with
   the actual <audio> element in BuildingAudio. */

import Image from "next/image";
import { useState } from "react";
import { asset } from "@/lib/config";
import { useMute } from "@/lib/mute";

export function MuteButton({ width = 50, className = "" }: { width?: number | string; className?: string }) {
  const { muted, toggle } = useMute();
  const [hover, setHover] = useState(false);
  const src = muted ? "/world/ui/audio_off.png" : "/world/ui/audio_on.png";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute music" : "Mute music"}
      aria-pressed={muted}
      title={muted ? "Unmute music" : "Mute music"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{ width }}
      className={`relative inline-block select-none transition-transform duration-fast active:scale-[0.97] hover:scale-[1.08] focus:outline-none ${className}`}
    >
      <Image
        src={asset(src)}
        alt=""
        width={359}
        height={309}
        priority
        draggable={false}
        className={`w-full h-auto pointer-events-none drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] transition-opacity duration-fast ${
          hover ? "opacity-100" : "opacity-90"
        }`}
      />
    </button>
  );
}
