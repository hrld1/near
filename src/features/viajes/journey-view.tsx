"use client";

import { useState } from "react";
import Link from "next/link";
import { useServerState } from "@/hooks/use-server-state";
import { ArrowLeft, Check, ChevronRight, Lock } from "lucide-react";
import { answerJourneyStepAction } from "@/actions/journeys";
import { journeyByKey } from "@/lib/journeys";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { QuestionStage, Reveal } from "@/features/questions/question-stage";
import { cn } from "@/lib/utils";

type StepState = {
  cardId: string;
  title: string;
  intro: string;
  prompt: string;
  myAnswer: string | null;
  partnerAnswered: boolean;
  partnerAnswer: string | null;
  complete: boolean; // ambos han respondido
};

// El icono no cruza la frontera servidor→cliente (una función no es
// serializable): se pasa la clave y se resuelve aquí (mismo patrón que DeckView).
type JourneyMeta = { journeyKey: string; title: string; subtitle: string; accent: string };

export function JourneyView({
  journey,
  partnerName,
  initial
}: {
  journey: JourneyMeta;
  partnerName: string;
  initial: StepState[];
}) {
  const [steps, setSteps] = useServerState<StepState[]>(initial);
  // paso actual = el primero que aún no está completo (ambos han respondido).
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => !s.complete)
  );
  const openIndex = steps.every((s) => s.complete) ? steps.length - 1 : currentIndex;
  const [idx, setIdx] = useState(openIndex);
  const JourneyIcon = journeyByKey(journey.journeyKey)?.icon;
  const allDone = steps.every((s) => s.complete);
  const doneCount = steps.filter((s) => s.complete).length;

  // un paso está desbloqueado si todos los anteriores están completos
  const unlocked = (i: number) => steps.slice(0, i).every((s) => s.complete);

  function onAnswered(cardId: string, myAnswer: string, partnerAnswer: string | null) {
    setSteps((ss) =>
      ss.map((s) =>
        s.cardId === cardId
          ? { ...s, myAnswer, partnerAnswer, complete: partnerAnswer !== null }
          : s
      )
    );
  }

  const current = steps[idx];

  return (
    <div>
      <Link
        href="/viajes"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Viajes
      </Link>

      <header className={cn("overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift", journey.accent)}>
        {JourneyIcon && <JourneyIcon className="h-8 w-8" />}
        <h1 className="mt-2 font-display text-3xl">{journey.title}</h1>
        <p className="mt-1 max-w-md text-sm text-white/85">{journey.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-black/20 px-3 py-1 backdrop-blur-sm">
            {doneCount} de {steps.length} pasos
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">Un paso al día, sin prisa</span>
        </div>
      </header>

      {/* El camino: cada paso con su estado. Solo se abren los desbloqueados. */}
      <ol className="mt-5 grid gap-1.5">
        {steps.map((s, i) => {
          const open = unlocked(i);
          const isCurrent = i === idx;
          const state = s.complete ? "done" : s.myAnswer ? "mine" : open ? "open" : "locked";
          return (
            <li key={s.cardId}>
              <button
                type="button"
                disabled={!open}
                onClick={() => open && setIdx(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition",
                  isCurrent ? "border-rose bg-rose-faint/60" : "border-sand-deep bg-paper",
                  open ? "hover:border-rose/60" : "cursor-not-allowed opacity-55"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    state === "done" && "bg-rose text-white",
                    state === "mine" && "border-2 border-rose text-rose-deep",
                    state === "open" && "border-2 border-sand-deep text-ink-soft",
                    state === "locked" && "bg-sand text-ink-soft/70"
                  )}
                >
                  {state === "done" ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : state === "locked" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", open ? "text-ink" : "text-ink-soft")}>
                    {s.title}
                  </span>
                  <span className="block text-2xs text-ink-soft">
                    {state === "done"
                      ? "Abierto por los dos"
                      : state === "mine"
                        ? `Esperando a ${partnerName}`
                        : state === "open"
                          ? "Os toca"
                          : "Se abre al terminar el anterior"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {current && (
        <div className="mt-5">
          <QuestionStage
            eyebrow={journey.title}
            counter={`Paso ${idx + 1} / ${steps.length}`}
            question={current.prompt}
          >
            <StepBody
              key={current.cardId}
              step={current}
              partnerName={partnerName}
              hasNextUnlocked={idx < steps.length - 1}
              onAnswered={onAnswered}
              onNext={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
            />
          </QuestionStage>
        </div>
      )}

      {allDone && (
        <p className="mt-5 text-center text-sm font-medium text-rose-deep">
          Habéis recorrido este viaje entero. Lo hablado se queda con vosotros.
        </p>
      )}
    </div>
  );
}

function StepBody({
  step,
  partnerName,
  hasNextUnlocked,
  onAnswered,
  onNext
}: {
  step: StepState;
  partnerName: string;
  hasNextUnlocked: boolean;
  onAnswered: (cardId: string, myAnswer: string, partnerAnswer: string | null) => void;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = answer.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    const res = await answerJourneyStepAction({ cardId: step.cardId, answer: text });
    if (res.ok && res.data) {
      onAnswered(step.cardId, text, res.data.partnerAnswer);
      setAnswer("");
    } else if (!res.ok) {
      setError(res.error);
    }
    setSaving(false);
  }

  if (step.myAnswer) {
    return (
      <div className="space-y-3">
        <Reveal myAnswer={step.myAnswer} partnerAnswer={step.partnerAnswer} partnerName={partnerName} />
        {step.complete ? (
          hasNextUnlocked && (
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={onNext}>
                Siguiente paso
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )
        ) : (
          <p className="rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink-soft">
            El siguiente paso se abrirá en cuanto {partnerName} responda a este. Sin prisa: os espera aquí.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="border-l-2 border-rose/40 pl-3.5 text-sm italic leading-relaxed text-ink-soft">
        {step.intro}
      </p>
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder="Tu respuesta…"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Lock className="h-3.5 w-3.5" />
          {step.partnerAnswered
            ? `${partnerName} ya ha dado su paso: responde para verlo`
            : "Respondéis a ciegas: lo suyo se revela al responder"}
        </p>
        <Button onClick={submit} loading={saving} disabled={!answer.trim()}>
          Responder
        </Button>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
