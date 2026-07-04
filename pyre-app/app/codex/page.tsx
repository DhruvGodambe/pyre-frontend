/* The PUBLIC Ember Codex page (/codex). Open to everyone, so KOLs can read how
   Pyre works without any access to the kingdom. Marked noindex: shareable by
   link, but not advertised to search engines while we're pre-launch. */

import type { Metadata } from "next";
import { CodexPage } from "@/components/codex-page";

export const metadata: Metadata = {
  title: "The Ember Codex: Pyre Protocol",
  description: "Official Pyre Protocol documentation: the flame, the decay, the yield.",
  robots: { index: false, follow: false },
};

export default function Codex() {
  return <CodexPage />;
}
