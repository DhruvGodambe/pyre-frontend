/* Per-building deep links. Any /app/<slug> (e.g. /app/ashencup) renders the same
   single-page app; the client reads the URL and opens that building (see
   lib/navigation.tsx). page.tsx handles the bare /app; this catch-all handles
   every building path. Real routes (login, api) take precedence over this. */

import { AppShell } from "@/components/shells/app-shell";

export default function BuildingDeepLink() {
  return <AppShell />;
}
