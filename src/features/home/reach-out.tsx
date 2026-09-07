"use client";

import { useState, useTransition } from "react";
import { Check, Hand, Heart } from "lucide-react";
import { sendNudgeAction } from "@/actions/presence";
import { cn } from "@/lib/utils";

// Tender la mano (it46). El servidor solo pinta esta tarjeta cuando TÚ ya has
// pasado hoy por Near y tu pareja aún no —el momento exacto en que el sector
// pierde a la gente: uno sigue y el otro se descuelga en silencio—. La clave es
// el tono: no es "tu pareja no ha hecho nada", es "mándale un guiño". El gesto
// es el nudge de siempre ("X está pensando en ti"), que le llega como push y la
// trae de vuelta sin que suene a reproche. Una sola vez: al enviarlo desaparece.
export function ReachOut({ partnerName }: { partnerName: string }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendNudgeAction();
      if (result.ok) setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-rose/20 bg-rose-faint px-4 py-3 text-sm font-medium text-rose-deep">
        <Check className="h-4 w-4 shrink-0" />
        Se lo hemos hecho llegar. {partnerName} sabrá que piensas en ella/él.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose/20 bg-gradient-to-br from-rose-faint to-paper px-4 py-3 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
        <Hand className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight text-ink">
          {partnerName} aún no ha pasado por aquí hoy
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          Un guiño tuyo puede alegrarle el día — sin prisa ni reproche.
        </p>
      </div>
      <button
        onClick={send}
        disabled={pending}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-rose to-rose-deep px-4 py-2 text-sm font-medium text-white shadow-card transition hover:brightness-105 active:scale-95 disabled:opacity-60"
      >
        <Heart className="h-4 w-4 fill-current" />
        Mandar un guiño
      </button>
    </div>
  );
}
