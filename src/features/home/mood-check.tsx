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
      {/* it42: una fila compacta en vez de una rejilla de botones grandes — es
          un gesto de un toque al día, no merece una tarjeta entera. */}
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => {
              setSelected(mood.key);
              setDirty(true);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition active:scale-95",
              selected === mood.key
                ? "border-rose bg-rose-faint text-ink"
                : "border-sand bg-paper text-ink-soft hover:bg-sand"
            )}
          >
            <span className="text-base leading-none">{mood.emoji}</span>
            <span className="font-medium">{mood.label}</span>
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
