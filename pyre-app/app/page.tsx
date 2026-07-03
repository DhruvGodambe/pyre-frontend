/* The PUBLIC front door: the cinematic trailer, then the gate. Open to everyone
   (no password), so KOLs can watch the film and read the Ember Codex without any
   access to the kingdom. The gate offers two doors: "Enter Pyre Kingdom" (live
   only for the team) and "Read the Ember Codex" (open to all). The kingdom itself
   lives under /kingdom and is gated by middleware. */

import { FrontDoor } from "@/components/front-door";

export default function Home() {
  return <FrontDoor />;
}
