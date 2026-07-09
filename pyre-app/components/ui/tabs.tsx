"use client";

import { useState, type ReactNode } from "react";

/* Simple two-or-more tab switcher (used by The Forge: Stake / Burn).
   Uncontrolled by default; pass `active` + `onChange` to control it (e.g. so a
   deep-link can open a specific tab, see The Ashen Cup). */
export function Tabs({
  tabs,
  active: activeProp,
  onChange,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  active?: string;
  onChange?: (id: string) => void;
}) {
  const [internal, setInternal] = useState(tabs[0]?.id);
  const active = activeProp ?? internal;
  const setActive = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };
  return (
    <div>
      <div role="tablist" className="seg mb-4 flex w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            data-active={active === t.id}
            onClick={() => setActive(t.id)}
            className="seg-item"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === active)?.content}
    </div>
  );
}
