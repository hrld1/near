"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { submitScoreAction } from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/features/play/confetti";
import { gameVisual } from "@/components/product-icons";
import { cn } from "@/lib/utils";
import { ReactionGame } from "@/features/play/games/reaction";
import { MemoryGame } from "@/features/play/games/memory";
import { TargetsGame } from "@/features/play/games/targets";
import { EchoGame } from "@/features/play/games/echo";
import { AnagramGame } from "@/features/play/games/anagram";
import { SprintGame } from "@/features/play/games/sprint";
import { TypingGame } from "@/features/play/games/typing";
import { GolfGame } from "@/features/play/games/golf";
import { CapsGame } from "@/features/play/games/caps";

export type GameHostProps = {
  gameKey: string;
  name: string;
  rules: string;
  unit: string;
  lowerIsBetter: boolean;
  attemptsLeft: number;
  myBest: number | null;
  partnerBest: number | null;
  partnerName: string;
  formatHint: "ms" | "s" | "int";
  isDaily: boolean;
  anagramWords?: { word: string; scrambled: string }[];
};

function formatScore(value: number, hint: GameHostProps["formatHint"], unit: string) {
  if (hint === "s") return `${value.toFixed(1)} ${unit}`;
  return `${Math.round(value)} ${unit}`;
}

export function GameHost(props: GameHostProps) {
  const visual = gameVisual(props.gameKey);
  const VisualIcon = visual.icon;
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [attempt, setAttempt] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(props.attemptsLeft);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(props.myBest);
  const [beatPartner, setBeatPartner] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function start() {
    setError(null);
    setAttempt((a) => a + 1);
    setPhase("playing");
  }

  function handleFinish(score: number) {
    setLastScore(score);
    setPhase("done");
    startTransition(async () => {
      const result = await submitScoreAction({ gameKey: props.gameKey, score });
      if (result.ok && result.data) {
        setBest(result.data.best);
        setAttemptsLeft(result.data.attemptsLeft);
        setBeatPartner(result.data.beatPartner);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const newRecord =
    lastScore !== null &&
    (props.myBest === null ||
      (props.lowerIsBetter ? lastScore < props.myBest : lastScore > props.myBest));

  return (
    <div className="relative">
      {phase === "done" && (newRecord || beatPartner) && <Confetti />}

      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Arcade
        </Link>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink-soft">
          {attemptsLeft} {attemptsLeft === 1 ? "intento" : "intentos"} hoy
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className={cn("relative overflow-hidden bg-gradient-to-br px-5 py-4 text-white", visual.accent)}>
          <VisualIcon className="absolute -right-3 -top-3 h-20 w-20 opacity-15" />
          <h1 className="flex items-center gap-2 font-display text-2xl">
            <VisualIcon className="h-5 w-5" />
            {props.name}
            {props.isDaily && (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-sans font-semibold uppercase tracking-wide backdrop-blur-sm">
                Reto del dia
              </span>
            )}
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/85">{props.rules}</p>
        </div>

        <div className="min-h-[380px]">
          {phase === "intro" && (
            <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 px-6 text-center">
              <span className={cn("flex h-20 w-20 items-center justify-center rounded-3xl", visual.accentSoft, visual.accentText)}>
                <VisualIcon className="h-10 w-10" />
              </span>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">Tu mejor hoy</p>
                  <p className="mt-0.5 font-display text-xl text-ink">
                    {best !== null ? formatScore(best, props.formatHint, props.unit) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">{props.partnerName}</p>
                  <p className="mt-0.5 font-display text-xl text-ink">
                    {props.partnerBest !== null
                      ? formatScore(props.partnerBest, props.formatHint, props.unit)
                      : "—"}
                  </p>
                </div>
              </div>
              {attemptsLeft > 0 ? (
                <Button size="lg" onClick={start}>
                  Jugar
                </Button>
              ) : (
                <p className="text-sm text-ink-soft">
                  Sin intentos por hoy. Manana hay reto nuevo.
                </p>
              )}
            </div>
          )}

          {phase === "playing" && (
            <div key={attempt}>
              {props.gameKey === "reaction" && <ReactionGame onFinish={handleFinish} />}
              {props.gameKey === "memory" && <MemoryGame onFinish={handleFinish} />}
              {props.gameKey === "targets" && <TargetsGame onFinish={handleFinish} />}
              {props.gameKey === "echo" && <EchoGame onFinish={handleFinish} />}
              {props.gameKey === "anagram" && (
                <AnagramGame onFinish={handleFinish} words={props.anagramWords ?? []} />
              )}
              {props.gameKey === "sprint" && <SprintGame onFinish={handleFinish} />}
              {props.gameKey === "typing" && <TypingGame onFinish={handleFinish} />}
              {props.gameKey === "golf" && <GolfGame onFinish={handleFinish} />}
              {props.gameKey === "caps" && <CapsGame onFinish={handleFinish} />}
            </div>
          )}

          {phase === "done" && (
            <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 px-6 text-center">
              <Trophy className={newRecord ? "h-9 w-9 text-amber-500" : "h-9 w-9 text-sand-deep"} />
              <p className="text-sm uppercase tracking-wide text-ink-soft">Tu resultado</p>
              <p className="font-display text-4xl text-ink">
                {lastScore !== null && formatScore(lastScore, props.formatHint, props.unit)}
              </p>
              {newRecord && <p className="text-sm font-medium text-amber-600">Nuevo record personal de hoy</p>}
              {beatPartner === true && (
                <p className="text-sm font-medium text-rose-deep">
                  Vas por delante de {props.partnerName}
                </p>
              )}
              {beatPartner === false && (
                <p className="text-sm text-ink-soft">
                  {props.partnerName} sigue en cabeza... te quedan {attemptsLeft} intentos.
                </p>
              )}
              {beatPartner === null && (
                <p className="text-sm text-ink-soft">
                  {props.partnerName} aun no ha jugado hoy. Presume de marca en el chat.
                </p>
              )}
              {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
              <div className="mt-2 flex gap-2">
                {attemptsLeft > 0 && (
                  <Button onClick={start}>
                    <RotateCcw className="h-4 w-4" /> Otra vez
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setPhase("intro")}>
                  Resumen
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
