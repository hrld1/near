"use client";

import { useState, useTransition } from "react";
import { setMoodAction } from "@/actions/presence";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOODS, cn } from "@/lib/utils";

export function MoodCheck({
  currentMood,
  currentNote
}: {
  currentMood: string | null;
  currentNote: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(currentMood);
  const [note, setNote] = useState(currentNote ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await setMoodAction({ mood: selected, note: note || undefined });
      if (!result.ok) setError(result.error);
      else setDirty(false);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => {
              setSelected(mood.key);
              setDirty(true);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition",
              selected === mood.key
                ? "border-rose bg-rose-faint"
                : "border-sand bg-paper hover:bg-sand"
            )}
          >
            <span className="text-xl">{mood.emoji}</span>
            <span className="text-[11px] font-medium text-ink-soft">{mood.label}</span>
          </button>
        ))}
      </div>
      {(dirty || selected) && (
        <div className="mt-3 flex gap-2">
          <Input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
            placeholder="Algo que añadir? (opcional)"
            maxLength={200}
            className="h-9 text-xs"
          />
          <Button size="sm" onClick={save} loading={pending} disabled={!selected || !dirty}>
            {dirty ? "Guardar" : "Al día"}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
