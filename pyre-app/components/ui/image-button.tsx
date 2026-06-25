"use client";

/* IMAGE BUTTON, the designer's ornate pre-rendered buttons (UI_Elements). Each
   button is a normal + hover PNG pair under /world/ui; we swap on hover and keep
   the art's own aspect ratio. Use for the big diegetic actions (Enter a building,
   Return to Pyre, Execute trade) where the engraved frame is the look.

   The art has baked-in text, so the label lives in the image, `aria-label`
   carries it for screen readers. `width` is a CSS max in px; the height follows
   the art ratio so it never distorts. */

import Image from "next/image";
import { useState } from "react";
import { asset } from "@/lib/config";

/* name → [normal, hover, intrinsic w, h]. Add a row when the designer ships
   more. */
const BUTTONS = {
  enter: ["/world/ui/enter_normal.webp", "/world/ui/enter_hover.webp", 535, 158],
  confirm: ["/world/ui/confirm_normal.webp", "/world/ui/confirm_hover.webp", 535, 158],
  ok: ["/world/ui/ok_normal.webp", "/world/ui/ok_hover.webp", 535, 158],
  return: ["/world/ui/return_normal.webp", "/world/ui/return_hover.webp", 1254, 419],
  trade: ["/world/ui/trade_normal.webp", "/world/ui/trade_hover.webp", 1342, 173],
  support: ["/world/ui/support_normal.webp", "/world/ui/support_hover.webp", 626, 227],
  // Designer action buttons (baked-in text). Pending state is shown by the
  // overlay below, not by changing the label. burn = primary Burn $PYRE.
  burn: ["/world/ui/burn_normal.png", "/world/ui/burn_hover.png", 1075, 203],
  burnmore: ["/world/ui/burnmore_normal.png", "/world/ui/burnmore_hover.png", 686, 177],
  stakemore: ["/world/ui/stakemore_normal.png", "/world/ui/stakemore_hover.png", 686, 177],
} as const;

export type ImageButtonName = keyof typeof BUTTONS;

export function ImageButton({
  name,
  onClick,
  label,
  width = 220,
  disabled = false,
  pending = false,
  className = "",
}: {
  name: ImageButtonName;
  onClick?: () => void;
  /** accessible label (the visible text is baked into the art). */
  label: string;
  /** rendered width (px number, or a CSS length like "100%"). Height follows the art ratio. */
  width?: number | string;
  disabled?: boolean;
  /** in-flight: dim the art and show a spinner over it (the baked text can't change). */
  pending?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [normal, hovered, w, h] = BUTTONS[name];
  const inactive = disabled || pending;
  const src = hover && !inactive ? hovered : normal;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inactive}
      aria-label={label}
      aria-busy={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{ width }}
      className={`relative inline-block select-none transition-transform duration-fast active:scale-[0.97] hover:scale-[1.03] disabled:opacity-50 disabled:pointer-events-none focus:outline-none ${className}`}
    >
      <Image
        src={asset(src)}
        alt=""
        width={w}
        height={h}
        priority
        className={`w-full h-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] pointer-events-none transition-opacity duration-fast ${
          pending ? "opacity-40" : ""
        }`}
        draggable={false}
      />
      {pending && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </span>
      )}
    </button>
  );
}
