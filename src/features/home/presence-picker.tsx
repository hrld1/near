"use client";

import { useState, useTransition } from "react";
import { setPresenceAction } from "@/actions/presence";
import { PRESENCES, cn } from "@/lib/utils";

export function PresencePicker({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [, startTransition] = useTransition();

  function select(key: string) {
    setValue(key);
    startTransition(() => {
      void setPresenceAction(key);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESENCES.filter((p) => p.key !== "NONE").map((presence) => (
        <button
          key={presence.key}
          onClick={() => select(value === presence.key ? "NONE" : presence.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            value === presence.key
              ? "border-rose bg-rose-faint text-rose-deep"
              : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", presence.dot)} />
          {presence.label}
        </button>
      ))}
    </div>
  );
}
