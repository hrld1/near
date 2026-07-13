"use client";

import Link from "next/link";
import { ArrowLeft, Wifi } from "lucide-react";
import { compareScores, gameByKey } from "@/lib/games";
import { gameVisual } from "@/components/product-icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/features/play/confetti";
import { ArcadeGameView } from "@/features/play/games/arcade-view";
import { cn } from "@/lib/utils";
import { useRace } from "./use-race";

export function RaceRoom({
  gameKey,
  myId,
  myName,
  partnerName,
  anagramWords
}: {
  // la clave, no el GameDef: un objeto con funciones (format) no puede
  // cruzar la frontera servidor→cliente; el def se resuelve aquí dentro
  gameKey: string;
  myId: string;
  myName: string;
  partnerName: string;
  anagramWords?: { word: string; scrambled: string }[];
}) {
  const def = gameByKey(gameKey)!;
  const visual = gameVisual(def.key);
  const Icon = visual.icon;
  const race = useRace(def, myId);
  const { phase } = race;

  const iFinished = race.myFinal !== null;
  const bothDone = race.myFinal !== null && race.oppFinal !== null;
  const iWon = bothDone ? compareScores(def, race.myFinal!, race.oppFinal!) < 0 : false;
  const tie = bothDone ? compareScores(def, race.myFinal!, race.oppFinal!) === 0 : false;

  const scale = Math.max(race.myScore, race.oppScore, 1);
  const playing = phase === "playing" || phase === "over";

  return (
    <div className="relative">
      {phase === "over" && iWon && <Confetti />}

      <div className="mb-4 flex items-center justify-between">
        <Link href={`/play/${def.key}`} className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {def.name}
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Wifi className="h-3 w-3" /> En vivo
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className={cn("relative overflow-hidden bg-gradient-to-br px-5 py-4 text-white", visual.accent)}>
          <Icon className="absolute -right-3 -top-3 h-20 w-20 opacity-15" />
          <h1 className="flex items-center gap-2 font-display text-2xl">
            <Icon className="h-5 w-5" /> Duelo · {def.name}
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/85">
            Los dos jugáis a la vez y veis el marcador del otro en directo.
          </p>
        </div>

        <div className="p-5">
          {phase === "lobby" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-20 w-20 items-center justify-center rounded-3xl", visual.accentSoft, visual.accentText)}>
                <Icon className="h-10 w-10" />
              </span>
              <p className="max-w-xs text-sm text-ink-soft">
                Reta a {partnerName}: jugaréis la misma prueba a la vez y gana la mejor marca.
              </p>
              {race.notice && <p className="text-sm font-medium text-rose-deep">{race.notice}</p>}
              <Button size="lg" onClick={race.invite}>
                Retar a {partnerName}
              </Button>
            </div>
          )}

          {phase === "inviting" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl", visual.accentSoft, visual.accentText)}>
                <Icon className="h-8 w-8" />
              </span>
              <p className="text-sm font-medium text-ink">Esperando a {partnerName}...</p>
              <Button variant="secondary" size="sm" onClick={race.cancel}>
                Cancelar
              </Button>
            </div>
          )}

          {phase === "incoming" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className={cn("flex h-16 w-16 animate-pulse-heart items-center justify-center rounded-3xl", visual.accentSoft, visual.accentText)}>
                <Icon className="h-8 w-8" />
              </span>
              <p className="font-display text-xl text-ink">{partnerName} te reta a {def.name}</p>
              <div className="flex gap-2">
                <Button onClick={race.accept}>Jugar</Button>
                <Button variant="secondary" onClick={race.cancel}>
                  Ahora no
                </Button>
              </div>
            </div>
          )}

          {phase === "countdown" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm uppercase tracking-wide text-ink-soft">Preparados...</p>
              <p key={race.count} className="animate-pop-in font-display text-7xl text-ink">
                {race.count > 0 ? race.count : "¡Ya!"}
              </p>
            </div>
          )}

          {playing && (
            <div>
              {/* barra vs */}
              <div className="mb-3 space-y-2">
                <VsRow name={myName} score={race.myScore} format={def.format} scale={scale} lowerIsBetter={def.lowerIsBetter} tone="me" leading={compareScores(def, race.myScore, race.oppScore) < 0} />
                <VsRow name={partnerName} score={race.oppScore} format={def.format} scale={scale} lowerIsBetter={def.lowerIsBetter} tone="them" leading={compareScores(def, race.myScore, race.oppScore) > 0} />
              </div>

              {phase === "playing" && (
                <div className="relative">
                  <ArcadeGameView
                    key={race.round}
                    gameKey={def.key}
                    onFinish={race.reportFinish}
                    onProgress={race.reportProgress}
                    anagramWords={anagramWords}
                  />
                  {iFinished && (
                    <div className="mt-1 text-center text-sm font-medium text-ink-soft">
                      Has terminado con <b className="text-ink">{def.format(race.myFinal!)}</b>. Esperando a {partnerName}...
                    </div>
                  )}
                </div>
              )}

              {phase === "over" && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="font-display text-3xl text-ink">
                    {tie ? "¡Empate!" : iWon ? "¡Ganas el duelo!" : `Gana ${partnerName}`}
                  </p>
                  <div className="flex items-center gap-5 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-soft">{myName}</p>
                      <p className="mt-0.5 font-display text-2xl text-ink">{def.format(race.myFinal ?? 0)}</p>
                    </div>
                    <span className="font-display text-lg italic text-ink-soft">vs</span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-soft">{partnerName}</p>
                      <p className="mt-0.5 font-display text-2xl text-ink">{def.format(race.oppFinal ?? 0)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={race.invite}>Revancha</Button>
                    <Link href={`/play/${def.key}`} className="flex items-center rounded-full border border-sand-deep px-4 text-sm font-medium text-ink transition hover:bg-sand">
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

function VsRow({
  name,
  score,
  format,
  scale,
  lowerIsBetter,
  tone,
  leading
}: {
  name: string;
  score: number;
  format: (n: number) => string;
  scale: number;
  lowerIsBetter: boolean;
  tone: "me" | "them";
  leading: boolean;
}) {
  // en juegos de "menos es mejor", el que va MÁS bajo llena más la barra
  const raw = lowerIsBetter ? 1 - score / scale : score / scale;
  const pct = Math.max(4, Math.min(100, raw * 100));
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} size="sm" tone={tone === "them" ? 1 : 0} className={cn("ring-2", leading ? "ring-amber-400" : "ring-transparent")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate font-medium text-ink">{name}</span>
          <span className="font-display text-sm text-ink">{format(score)}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              tone === "me" ? "bg-gradient-to-r from-rose to-rose-deep" : "bg-gradient-to-r from-slate-400 to-slate-600"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
