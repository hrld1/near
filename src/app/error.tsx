"use client";

import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";

// Última red de la app: si una página revienta, esto evita el pantallazo
// tecnico de Next y ofrece reintentar.
export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-3xl border border-sand bg-paper p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-faint">
          <HeartCrack className="h-7 w-7 text-rose" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-ink">Algo se ha torcido</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          No eres tu, somos nosotros. Vuelve a intentarlo; si sigue pasando,
          recarga la página.
        </p>
        {error.digest && (
          <p className="mt-2 text-2xs uppercase tracking-wider text-ink-soft/60">
            ref: {error.digest}
          </p>
        )}
        <Button className="mt-5 w-full" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
