"use client";

import { useState, type ReactNode } from "react";

/* Simple two-or-more tab switcher (used by The Forge: Stake / Burn).
   Uncontrolled by default; pass `active` + `onChange` to control it (e.g. so a
   deep-link can open a specific tab — see The Ashen Cup). */
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
      <div role="tablist" className="flex gap-1 mb-4 rounded-md bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 rounded-sm px-3 py-2 text-sm transition-colors duration-fast ${
              active === t.id ? "bg-brand text-bg" : "text-text-2 hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === active)?.content}
    </div>
  );
}
