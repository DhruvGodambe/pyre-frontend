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
  // THE GRAND EXCHANGE, the designer's ornate swap tools: the gilded up/down
  // direction flip (single art, no hover variant) and the brass settings gear.
  swapicon: ["/world/ui/swap_icon.webp", "/world/ui/swap_icon.webp", 583, 568],
  settings: ["/world/ui/settings_normal.png", "/world/ui/settings_hover.png", 199, 193],
  // Designer action buttons (baked-in text). Pending state is shown by the
  // overlay below, not by changing the label. burn = primary Burn $PYRE.
  burn: ["/world/ui/burn_normal.png", "/world/ui/burn_hover.png", 1075, 203],
  burnmore: ["/world/ui/burnmore_normal.png", "/world/ui/burnmore_hover.png", 686, 177],
  stakemore: ["/world/ui/stakemore_normal.png", "/world/ui/stakemore_hover.png", 686, 177],
  // THE FORGE, matched orange "lava stone" set (Stake/Unstake + Burn/Burn-LP).
  stakepyre: ["/world/ui/stakepyre_normal.png", "/world/ui/stakepyre_hover.png", 420, 124],
  unstake: ["/world/ui/unstake_normal.png", "/world/ui/unstake_hover.png", 420, 124],
  burntokens: ["/world/ui/burntokens_normal.png", "/world/ui/burntokens_hover.png", 420, 124],
  burnlp: ["/world/ui/burnlp_normal.png", "/world/ui/burnlp_hover.png", 420, 124],
  // THE ASHEN CUP, quest CTAs (orange) + engraved gold-serif nav (dark stone).
  go: ["/world/ui/go_normal.png", "/world/ui/go_hover.png", 164, 87],
  like: ["/world/ui/like_normal.png", "/world/ui/like_hover.png", 197, 87],
  repost: ["/world/ui/repost_normal.png", "/world/ui/repost_hover.png", 236, 87],
  takequiz: ["/world/ui/takequiz_normal.png", "/world/ui/takequiz_hover.png", 332, 88],
  taketour: ["/world/ui/taketour_normal.png", "/world/ui/taketour_hover.png", 332, 88],
  sharex: ["/world/ui/sharex_normal.png", "/world/ui/sharex_hover.png", 665, 121],
  viewleaderboard: ["/world/ui/viewleaderboard_normal.png", "/world/ui/viewleaderboard_hover.png", 665, 121],
  completequest: ["/world/ui/completequest_normal.png", "/world/ui/completequest_hover.png", 665, 121],
  // THE GUIDED TOUR, the Emberkeeper's narration-box controls + replay affordance.
  begintour: ["/world/ui/begintour_normal.png", "/world/ui/begintour_hover.png", 450, 123],
  stepinside: ["/world/ui/stepinside_normal.png", "/world/ui/stepinside_hover.png", 401, 123],
  continue: ["/world/ui/continue_normal.png", "/world/ui/continue_hover.png", 545, 171],
  back: ["/world/ui/back_normal.png", "/world/ui/back_hover.png", 239, 106],
  replaytour: ["/world/ui/replaytour_normal.png", "/world/ui/replaytour_hover.png", 593, 166],
  // THE EMBER CODEX, the persistent tome button (book glyph + "The Codex"),
  // same engraved frame family as Replay tour.
  codex: ["/world/ui/codex_button_normal.png", "/world/ui/codex_button_hover.png", 593, 166],
  skiptour: ["/world/ui/skiptour_normal.png", "/world/ui/skiptour_hover.png", 593, 166],
  skipintro: ["/world/ui/skipintro_normal.png", "/world/ui/skipintro_hover.png", 593, 166],
  question: ["/world/ui/question_normal.png", "/world/ui/question_hover.png", 256, 232],
  // THE BLACK MARKET, tab labels (Listings / Recent activity / Your Acolyte),
  // the two variant filter chips, and the "Sell on the Black Market" link out.
  listings: ["/world/ui/listings_normal.png", "/world/ui/listings_hover.png", 307, 149],
  recentactive: ["/world/ui/recentactive_normal.png", "/world/ui/recentactive_hover.png", 307, 149],
  youracolyte: ["/world/ui/youracolyte_normal.png", "/world/ui/youracolyte_hover.png", 307, 149],
  lpvariant: ["/world/ui/lpvariant_normal.png", "/world/ui/lpvariant_hover.png", 381, 149],
  immolatedvariant: ["/world/ui/immolated_normal.png", "/world/ui/immolated_hover.png", 381, 149],
  sellblackmarket: ["/world/ui/sell_blackmarket_button_normal.png", "/world/ui/sell_blackmarket_button_hover.png", 670, 177],
} as const;

export type ImageButtonName = keyof typeof BUTTONS;

/* Consistent button HEIGHTS (the logical scale). Because each plate art has its
   own aspect ratio, sizing by width made every button a different height; sizing
   by height keeps them uniform and lets width follow the label naturally. */
export type ButtonSize = "sm" | "md" | "lg";
const SIZE_H: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 56 };

/* Presentational art only (no <button>): the normal/hover PNG pair with the
   hover swap + pending overlay baked in. Render this directly inside an <a> (a
   diegetic link CTA, e.g. Share on X) where a nested <button> would be invalid,
   or let ImageButton wrap it in a real button for actions. The parent drives
   `hover` so an anchor (group-hover) can light the art on its own. */
export function ImageArt({
  name,
  width,
  size,
  hover = false,
  inactive = false,
  pending = false,
  className = "",
}: {
  name: ImageButtonName;
  /** rendered width (px or CSS length); height follows the art ratio. */
  width?: number | string;
  /** consistent-height sizing (preferred): sm/md/lg. Width follows the art. */
  size?: ButtonSize;
  hover?: boolean;
  inactive?: boolean;
  pending?: boolean;
  className?: string;
}) {
  const [normal, hovered, w, h] = BUTTONS[name];
  const src = hover && !inactive ? hovered : normal;
  // Height-based (size) keeps buttons uniform; width-based is the legacy fallback.
  const style: React.CSSProperties = size ? { height: SIZE_H[size] } : { width: width ?? 220 };
  const fit = size ? "h-full w-auto" : "w-full h-auto";
  return (
    <span style={style} className={`relative inline-flex select-none ${className}`}>
      <Image
        src={asset(src)}
        alt=""
        width={w}
        height={h}
        priority
        className={`${fit} drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] pointer-events-none transition-opacity duration-fast ${
          pending ? "opacity-40" : ""
        }`}
        draggable={false}
      />
      {pending && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </span>
      )}
    </span>
  );
}

export function ImageButton({
  name,
  onClick,
  label,
  width,
  size,
  disabled = false,
  pending = false,
  selected = false,
  dim = false,
  className = "",
}: {
  name: ImageButtonName;
  onClick?: () => void;
  /** accessible label (the visible text is baked into the art). */
  label: string;
  /** legacy width (px number, or a CSS length like "100%"). Prefer `size`. */
  width?: number | string;
  /** consistent-height sizing (preferred): sm/md/lg. */
  size?: ButtonSize;
  disabled?: boolean;
  /** in-flight: dim the art and show a spinner over it (the baked text can't change). */
  pending?: boolean;
  /** part of a group (tabs / toggles): keep the art lit to mark the current choice. */
  selected?: boolean;
  /** fade back when another item in the group is the active one. */
  dim?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const inactive = disabled || pending;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inactive}
      aria-label={label}
      aria-pressed={selected || undefined}
      aria-busy={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={size ? undefined : { width: width ?? 220 }}
      className={`relative inline-flex select-none transition-[transform,opacity] duration-fast active:scale-[0.97] hover:scale-[1.03] disabled:opacity-50 disabled:pointer-events-none focus:outline-none ${
        dim && !hover ? "opacity-55 hover:opacity-100" : ""
      } ${className}`}
    >
      <ImageArt
        name={name}
        size={size}
        width={size ? undefined : "100%"}
        hover={hover || selected}
        inactive={inactive}
        pending={pending}
      />
    </button>
  );
}
