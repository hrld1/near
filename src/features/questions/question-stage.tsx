"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Escenario de "una pregunta en grande" (it33). El mismo lenguaje visual para
// la pregunta del día (protagonista del Home) y las cartas de los mazos: un
// epígrafe pequeño arriba, la pregunta grande y centrada, y debajo o el
// formulario para responder o la revelación recíproca. La lógica de guardar
// difiere entre ambos (server action distinta), así que eso NO vive aquí:
// solo la caja y la tipografía, para que se vean idénticos.
export function QuestionStage({
  eyebrow,
  counter,
  question,
  children,
  nav
}: {
  eyebrow: string;
  counter?: string;
  question: string;
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-rose/20 bg-gradient-to-br from-rose-faint to-paper p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-rose-deep">{eyebrow}</p>
        {counter && (
          <span className="rounded-full bg-rose/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-rose-deep">
            {counter}
          </span>
        )}
      </div>

      <p className="mt-3 text-balance font-display text-2xl leading-snug text-ink sm:text-[1.75rem]">
        {question}
      </p>

      <div className="mt-5">{children}</div>

      {nav && <div className="mt-5 border-t border-rose/12 pt-4">{nav}</div>}
    </div>
  );
}

// Revelación recíproca: idéntica en la pregunta del día y en los mazos. Tu
// respuesta arriba, la del otro debajo (o el aviso de que aún no ha llegado).
export function Reveal({
  myAnswer,
  partnerAnswer,
  partnerName
}: {
  myAnswer: string;
  partnerAnswer: string | null;
  partnerName: string | null;
}) {
  const name = partnerName ?? "tu pareja";
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-sand px-4 py-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-soft">Tú</p>
        <p className="mt-1 whitespace-pre-wrap text-read text-ink">{myAnswer}</p>
      </div>
      {partnerAnswer ? (
        <div className="rounded-2xl bg-rose-faint px-4 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-rose-deep">{name}</p>
          <p className="mt-1 whitespace-pre-wrap text-read text-ink">{partnerAnswer}</p>
        </div>
      ) : (
        <p className={cn("rounded-2xl border border-dashed border-sand-deep px-4 py-3 text-sm text-ink-soft")}>
          {name} aún no ha respondido. Su respuesta aparecerá aquí, sin que la pierdas.
        </p>
      )}
    </div>
  );
}
