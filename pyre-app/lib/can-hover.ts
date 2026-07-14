/* CAN THIS DEVICE ACTUALLY HOVER?

   The JS half of the fence that globals.css puts around every :hover rule (see
   .forged-btn there for the full story). The short version: a tap on a phone ALSO
   fires mouseenter. If that handler changes what is drawn (our image buttons swap to
   their molten art on hover), Safari reads the first tap as "the page reacted, the
   user may just be looking", delivers the hover and WITHHOLDS the click. The button
   then needs a second tap, and the nicer the button, the worse the bug.

   CSS solves it with `@media (hover: hover)`. A mouseenter HANDLER cannot be fenced by
   CSS, so it asks the same question here, and does nothing on a device that cannot
   really hover. No state change, no content change, so the first tap is a click.

   Called from inside event handlers, never during render: it reads the live device
   and would otherwise disagree with the server's HTML and break hydration. */

export function canHover(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(hover: hover)").matches;
}
