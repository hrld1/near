"use client";

import { useState, useTransition } from "react";
import { Gift, Sparkles } from "lucide-react";
import { openDailyBoxAction } from "@/actions/box";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  DARE: "Reto del día",
  QUESTION: "Pregunta valiente",
  GESTURE: "Pequeno gesto",
  FLASHBACK: "Flashback"
};

export function DailyBox({
  initial
}: {
  initial: { kind: string; content: string; openedBy: string | null } | null;
}) {
  const [box, setBox] = useState(initial);
  const [justOpened, setJustOpened] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await openDailyBoxAction();
      if (result.ok && result.data) {
        setBox({ kind: result.data.kind, content: result.data.content, openedBy: null });
        setJustOpened(true);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  if (!box) {
    return (
      <button
        onClick={open}
        disabled={pending}
        className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-rose/40 bg-rose-faint/50 px-4 py-7 transition hover:bg-rose-faint disabled:opacity-60"
      >
        <Gift
          className={cn(
            "h-8 w-8 text-rose transition group-hover:scale-110",
            pending && "animate-pulse-heart"
          )}
        />
        <p className="text-sm font-medium text-ink">Vuestra caja de hoy esta cerrada</p>
        <p className="text-xs text-ink-soft">Abridla y os toca a los dos. Una por día.</p>
        {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
      </button>
    );
  }

  return (
    <div className={cn("rounded-xl bg-rose-faint px-4 py-4", justOpened && "animate-pop-in")}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-deep">
        <Sparkles className="h-3.5 w-3.5" /> {KIND_LABEL[box.kind] ?? "Sorpresa"}
      </p>
      <p className="mt-2 font-display text-lg leading-snug text-ink">{box.content}</p>
      {box.openedBy && (
        <p className="mt-2 text-xs text-ink-soft">Abierta por {box.openedBy}</p>
      )}
    </div>
  );
}
