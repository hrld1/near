"use client";

import { useState } from "react";
import { Heart, X } from "lucide-react";

// El momento de llegada del invitado (it47). El servidor solo pinta esto a
// quien ACABA de entrar: pareja recién nacida, su pareja le dejó una nota
// esperando y aún no ha hecho su primer gesto. Convierte el arranque en un
// pacto —"alguien ya empezó vuestro hogar y te dejó esto"— para que el primer
// movimiento sea responder, no empezar de cero. Desaparece solo en cuanto
// aportas algo (el servidor deja de pintarlo); el aspa es por si quieres
// cerrarlo antes.
export function WelcomeArrival({ partnerName, note }: { partnerName: string; note: string }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-rose/25 bg-gradient-to-br from-rose-faint via-paper to-plum/10 p-6 shadow-card md:p-7">
      <button
        onClick={() => setClosed(true)}
        aria-label="Cerrar"
        className="absolute right-4 top-4 rounded-full p-1.5 text-ink-soft transition hover:bg-sand hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
        <Heart className="h-6 w-6 fill-current" />
      </span>
      <h2 className="mt-4 font-display text-2xl leading-tight text-ink">
        {partnerName} ya empezó vuestro hogar
      </h2>
      <p className="mt-1 text-read text-ink-soft">Y te dejó esto esperando:</p>
      <blockquote className="mt-3 border-l-2 border-rose/40 pl-4 font-display text-xl italic leading-snug text-ink">
        “{note}”
      </blockquote>
      <p className="mt-4 text-read text-ink-soft">
        Tu primer gesto: responde aquí abajo y empezará a contarse vuestra historia.
      </p>
    </section>
  );
}
