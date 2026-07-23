"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Wifi } from "lucide-react";
import type { DuelMeta } from "@/lib/duels";
import type { DuelPhase } from "./use-duel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Cromo compartido de todos los duelos: cabecera con gradiente del juego,
// insignia "En vivo", y las pantallas de lobby / esperando / reto entrante.
// En "playing" y "over" cede el hueco al tablero (children). El pie de "over"
// con el resultado y la revancha lo pinta el arnés si se le pasa `result`.

export function DuelFrame({
  meta,
  phase,
  notice,
  partnerName,
  onInvite,
  onAccept,
  onCancel,
  result,
  onRematch,
  children
}: {
  meta: DuelMeta;
  phase: DuelPhase;
  notice: string | null;
  partnerName: string;
  onInvite: () => void;
  onAccept: () => void;
  onCancel: () => void;
  result?: { text: string; iWon: boolean } | null;
  onRematch?: () => void;
  children?: ReactNode;
}) {
  const Icon = meta.icon;
  const playing = phase === "playing" || phase === "over";

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Arcade
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Wifi className="h-3 w-3" /> En vivo
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className={cn("relative overflow-hidden bg-gradient-to-br px-5 py-4 text-white", meta.accent)}>
          <Icon className="absolute -right-3 -top-3 h-20 w-20 opacity-15" />
          <h1 className="font-display text-2xl">{meta.name}</h1>
          <p className="mt-1 max-w-md text-sm text-white/85">
            Cara a cara y en directo: {partnerName} tiene que estar con Near abierto.
          </p>
        </div>

        <div className="p-5">
          {phase === "lobby" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-20 w-20 items-center justify-center rounded-3xl", meta.soft, meta.text)}>
                <Icon className="h-9 w-9" />
              </span>
              <p className="max-w-xs text-sm text-ink-soft">{meta.blurb}</p>
              {notice && <p className="text-sm font-medium text-rose-deep">{notice}</p>}
              <Button size="lg" onClick={onInvite}>
                Retar a {partnerName}
              </Button>
              <p className="max-w-xs text-xs text-ink-soft">
                Le llegará el reto al instante si esta dentro de la app.
              </p>
            </div>
          )}

          {phase === "inviting" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl", meta.soft, meta.text)}>
                <Icon className="h-7 w-7" />
              </span>
              <p className="text-sm font-medium text-ink">Esperando a {partnerName}...</p>
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          )}

          {phase === "incoming" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-16 w-16 animate-pulse-heart items-center justify-center rounded-3xl", meta.soft, meta.text)}>
                <Icon className="h-7 w-7" />
              </span>
              <p className="font-display text-xl text-ink">
                {partnerName} te reta a {meta.name}
              </p>
              <div className="flex gap-2">
                <Button onClick={onAccept}>Jugar</Button>
                <Button variant="secondary" onClick={onCancel}>
                  Ahora no
                </Button>
              </div>
            </div>
          )}

          {playing && (
            <div>
              {children}
              {phase === "over" && result && (
                <div className="mt-4 flex flex-col items-center gap-3 text-center">
                  <p className="font-display text-2xl text-ink">{result.text}</p>
                  <div className="flex gap-2">
                    {onRematch && <Button onClick={onRematch}>Revancha</Button>}
                    <Link
                      href="/play"
                      className="flex items-center rounded-full border border-sand-deep px-4 text-sm font-medium text-ink transition hover:bg-sand"
                    >
                      Volver
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
