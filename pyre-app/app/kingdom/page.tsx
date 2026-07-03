/* The kingdom (the real app), gated by middleware to the team. Renders the app
   shell, which picks the Village (desktop) or the Dashboard (mobile). Reached by
   pressing "Enter Pyre Kingdom" on the public front door ("/"), or directly once
   authenticated. */

import { AppShell } from "@/components/shells/app-shell";

export default function Kingdom() {
  return <AppShell />;
}
