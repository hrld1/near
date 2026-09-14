"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain, Check, ChevronRight, GraduationCap, Puzzle, Sparkles, Swords, Trophy, X } from "lucide-react";
import { answerTriviaAction } from "@/actions/trivia";
import { type TriviaCategory, TRIVIA_CATEGORIES } from "@/lib/trivia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TriviaItem = {
  id: string;
  category: TriviaCategory;
  question: string;
  options: string[];
  correct: number;
  explain?: string;
  myChoice: number | null;
  partnerChoice: number | null; // solo si YO ya respondí
};

const CAT_ICON: Record<TriviaCategory, typeof Brain> = {
  acertijo: Puzzle,
  logica: Brain,
  curiosidad: Sparkles,
  cultura: GraduationCap
};

export function Trivia({
  items,
  myName,
  partnerName
}: {
  items: TriviaItem[];
  myName: string;
  partnerName: string;
}) {
  const router = useRouter();
  const firstPending = useMemo(() => items.findIndex((i) => i.myChoice === null), [items]);
  const current = firstPending >= 0 ? items[firstPending] : null;

  // revelación local tras responder (antes de pasar a la siguiente)
  const [revealed, setRevealed] = useState<{
    choice: number;
    correct: boolean;
    correctIndex: number;
    partnerChoice: number | null;
  } | null>(null);
  // pregunta CONGELADA mientras dura la revelación: al responder, mi propio
  // evento "quiz" me llega y refresca la página (avanzaría `current`); si no la
  // congelo, la revelación se pintaría sobre la pregunta siguiente.
  const [frozenId, setFrozenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const shown = revealed ? items.find((i) => i.id === frozenId) ?? null : current;

  // marcador sobre las preguntas que AMBOS habéis respondido
  const both = items.filter((i) => i.myChoice !== null && i.partnerChoice !== null);
  const myHits = both.filter((i) => i.myChoice === i.correct).length;
  const partnerHits = both.filter((i) => i.partnerChoice === i.correct).length;
  const answeredCount = items.filter((i) => i.myChoice !== null).length;

  function choose(index: number) {
    if (!current || revealed || pending) return;
    setError(null);
    const answering = current;
    startTransition(async () => {
      const res = await answerTriviaAction({ questionId: answering.id, choice: index });
      if (res.ok && res.data) {
        setFrozenId(answering.id);
        setRevealed({
          choice: index,
          correct: res.data.correct,
          correctIndex: res.data.correctIndex,
          partnerChoice: res.data.partnerChoice
        });
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function next() {
    setRevealed(null);
    setFrozenId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {(both.length > 0 || answeredCount > 0) && (
        <Scoreboard
          myName={myName}
          partnerName={partnerName}
          myHits={myHits}
          partnerHits={partnerHits}
          decided={both.length}
        />
      )}

      {shown ? (
        <QuestionCard
          item={shown}
          index={items.findIndex((i) => i.id === shown.id)}
          total={items.length}
          revealed={revealed}
          pending={pending}
          partnerName={partnerName}
          onChoose={choose}
          onNext={next}
          error={error}
        />
      ) : (
        <Card className="bg-rose-faint/60 p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-rose" />
          <h2 className="mt-3 font-display text-2xl text-ink">Habéis respondido todo</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {both.length < items.length
              ? `Cuando ${partnerName} termine, el marcador quedará cerrado.`
              : myHits === partnerHits
                ? "Empate de ingenio. Habrá que desempatar con más preguntas."
                : `Esta vez gana ${myHits > partnerHits ? "tu ingenio" : partnerName}.`}
          </p>
        </Card>
      )}
    </div>
  );
}

function Scoreboard({
  myName,
  partnerName,
  myHits,
  partnerHits,
  decided
}: {
  myName: string;
  partnerName: string;
  myHits: number;
  partnerHits: number;
  decided: number;
}) {
  const lead = myHits === partnerHits ? "tie" : myHits > partnerHits ? "me" : "partner";
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-rose-deep">
        <Swords className="h-4 w-4" /> Duelo de ingenio
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Side name={myName} hits={myHits} win={lead === "me"} />
        <span className="font-display text-lg italic text-ink-soft">vs</span>
        <Side name={partnerName} hits={partnerHits} win={lead === "partner"} align="right" />
      </div>
      <p className="mt-2 text-center text-2xs text-ink-soft">
        {decided === 0
          ? "El marcador se cierra en las preguntas que respondáis los dos"
          : `${decided} ${decided === 1 ? "pregunta decidida" : "preguntas decididas"}`}
      </p>
    </Card>
  );
}

function Side({ name, hits, win, align = "left" }: { name: string; hits: number; win: boolean; align?: "left" | "right" }) {
  return (
    <div className={cn("flex-1", align === "right" && "text-right")}>
      <p className="truncate text-xs text-ink-soft">
        {win && <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />}
        {name}
      </p>
      <p className={cn("font-display text-3xl leading-none", win ? "text-rose-deep" : "text-ink")}>{hits}</p>
    </div>
  );
}

function QuestionCard({
  item,
  index,
  total,
  revealed,
  pending,
  partnerName,
  onChoose,
  onNext,
  error
}: {
  item: TriviaItem;
  index: number;
  total: number;
  revealed: { choice: number; correct: boolean; correctIndex: number; partnerChoice: number | null } | null;
  pending: boolean;
  partnerName: string;
  onChoose: (index: number) => void;
  onNext: () => void;
  error: string | null;
}) {
  const CatIcon = CAT_ICON[item.category];
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose/10 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-rose-deep">
          <CatIcon className="h-3.5 w-3.5" /> {TRIVIA_CATEGORIES[item.category].name}
        </span>
        <span className="text-2xs font-medium tabular-nums text-ink-soft">
          {index + 1} / {total}
        </span>
      </div>
      <h2 className="mt-3 text-balance font-display text-2xl leading-snug text-ink">{item.question}</h2>

      <div className="mt-4 grid gap-2">
        {item.options.map((option, i) => {
          const isCorrect = i === item.correct;
          const isMine = revealed?.choice === i;
          const isPartner = revealed?.partnerChoice === i;
          const state = revealed
            ? isCorrect
              ? "correct"
              : isMine
                ? "wrong"
                : "dim"
            : "idle";
          return (
            <button
              key={i}
              disabled={!!revealed || pending}
              onClick={() => onChoose(i)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                state === "idle" && "border-sand-deep bg-paper text-ink hover:border-rose/50 hover:bg-sand",
                state === "correct" && "border-emerald-500 bg-emerald-500/10 font-medium text-ink",
                state === "wrong" && "border-red-400 bg-red-500/10 text-ink",
                state === "dim" && "border-sand bg-paper text-ink-soft"
              )}
            >
              <span>{option}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {isPartner && (
                  <span className="rounded-full bg-plum/15 px-1.5 py-0.5 text-2xs font-semibold text-plum">
                    {partnerName}
                  </span>
                )}
                {state === "correct" && <Check className="h-4 w-4 text-emerald-600" />}
                {state === "wrong" && <X className="h-4 w-4 text-red-500" />}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {revealed && (
        <div className="mt-4 space-y-3">
          <p className={cn("text-sm font-medium", revealed.correct ? "text-emerald-700 dark:text-emerald-400" : "text-rose-deep")}>
            {revealed.correct ? "¡Correcto!" : "Casi. La buena era la marcada en verde."}
            {revealed.partnerChoice !== null &&
              (revealed.partnerChoice === item.correct
                ? ` ${partnerName} también acertó.`
                : ` ${partnerName} falló esta.`)}
          </p>
          {item.explain && <p className="rounded-xl bg-sand px-4 py-2.5 text-sm text-ink-soft">{item.explain}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={onNext}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!revealed && (
        <p className="mt-4 text-xs text-ink-soft">
          Elige tu respuesta. Se bloquea al instante — sin cambios después.
        </p>
      )}
    </Card>
  );
}
