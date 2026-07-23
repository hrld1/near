"use client";

import Link from "next/link";
import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";

// Boundary de la zona autenticada: el resto de la app (sidebar, otras rutas)
// sigue navegable aunque una página falle.
export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-faint">
        <HeartCrack className="h-7 w-7 text-rose" />
      </span>
      <h1 className="mt-4 font-display text-2xl text-ink">No hemos podido cargar esto</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Ha fallado algo al preparar la página. Puedes reintentarlo o volver al inicio.
      </p>
      {error.digest && (
        <p className="mt-2 text-2xs uppercase tracking-wider text-ink-soft/60">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Link
          href="/home"
          className="rounded-xl border border-sand-deep px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-sand"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
