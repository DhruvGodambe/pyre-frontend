"use client";

/* THE EMBER CODEX, shared open/close state.

   A single in-world documentation reader, openable from ANYWHERE: a persistent
   tome button in both shells, the contextual "Read the rite" inside each building,
   and the gate/intro docs links. The reader itself is components/codex.tsx; the
   content is lib/codex/content.ts. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BuildingId } from "@/components/buildings";
import { CODEX, type CodexChapter } from "@/lib/codex/content";

interface CodexValue {
  isOpen: boolean;
  chapterId: string;
  chapter: CodexChapter;
  chapters: CodexChapter[];
  /** open the reader, optionally jumping to a chapter id. */
  open: (chapterId?: string) => void;
  /** open the reader at the chapter that documents a building. */
  openBuilding: (building: BuildingId) => void;
  setChapter: (chapterId: string) => void;
  close: () => void;
}

const CodexContext = createContext<CodexValue | null>(null);

export function CodexProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chapterId, setChapterId] = useState(CODEX[0].id);

  const open = useCallback((id?: string) => {
    if (id) setChapterId(id);
    setIsOpen(true);
  }, []);
  const openBuilding = useCallback((building: BuildingId) => {
    const ch = CODEX.find((c) => c.building === building);
    if (ch) setChapterId(ch.id);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const setChapter = useCallback((id: string) => setChapterId(id), []);

  const chapter = useMemo(
    () => CODEX.find((c) => c.id === chapterId) ?? CODEX[0],
    [chapterId]
  );

  const value = useMemo<CodexValue>(
    () => ({ isOpen, chapterId, chapter, chapters: CODEX, open, openBuilding, setChapter, close }),
    [isOpen, chapterId, chapter, open, openBuilding, setChapter, close]
  );

  return <CodexContext.Provider value={value}>{children}</CodexContext.Provider>;
}

export function useCodex(): CodexValue {
  const ctx = useContext(CodexContext);
  if (!ctx) throw new Error("useCodex must be used within <CodexProvider>");
  return ctx;
}
