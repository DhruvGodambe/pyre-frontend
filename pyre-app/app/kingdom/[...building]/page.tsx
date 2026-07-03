/* Per-building deep links inside the kingdom. Any /kingdom/<slug> (e.g.
   /kingdom/ashencup) renders the same single-page app; the client reads the URL
   and opens that building (see lib/navigation.tsx). kingdom/page.tsx handles the
   bare /kingdom; this catch-all handles every building path. Real routes (login,
   api) take precedence. Gated by middleware like the rest of the kingdom. */

import { AppShell } from "@/components/shells/app-shell";

export default function KingdomBuildingDeepLink() {
  return <AppShell />;
}
