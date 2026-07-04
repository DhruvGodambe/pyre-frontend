"use client";

/* THE EMBER CODEX, standalone public page (/codex, served at
   pyreprotocol.com/codex through the landing's rewrites).

   A dead-end reading room by design: no door to the gate. The landing offers
   a clean fork (read the Codex OR enter the app), the gate opens the Codex
   in a new tab, and X links land here directly. All rendering lives in the
   shared CodexBook (components/codex-book.tsx). */

import { useState } from "react";
import { CODEX } from "@/lib/codex/content";
import { CodexBook } from "@/components/codex-book";

export function CodexPage() {
  const [chapterId, setChapterId] = useState(CODEX[0].id);
  return <CodexBook chapterId={chapterId} onChapter={setChapterId} />;
}
