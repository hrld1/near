"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, X } from "lucide-react";
import { answerQuizAction } from "@/actions/quiz";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QuizItem = {
  id: number;
  text: string;
  options: string[];
  mine: { selfIndex: number; guessIndex: number } | null;
  partner: { selfIndex: number; guessIndex: number } | null; // solo si yo ya respondi
};

export function Quiz({
  items,
  myName,
  partnerName
}: {
  items: QuizItem[];
  myName: string;
  partnerName: string;
}) {
  const router = useRouter();
  const firstPending = useMemo(() => items.findIndex((i) => !i.mine), [items]);
  const [step, setStep] = useState<"self" | "guess">("self");
  const [selfIndex, setSelfIndex] = useState<number | null>(null);
  const [guessIndex, setGuessIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = firstPending >= 0 ? items[firstPending] : null;

  const results = items.filter((i) => i.mine && i.partner);
  const iGuessed = results.filter((i) => i.mine!.guessIndex === i.partner!.selfIndex).length;
  const partnerGuessed = results.filter((i) => i.partner!.guessIndex === i.mine!.selfIndex).length;

  function submit() {
    if (!current || selfIndex === null || guessIndex === null) return;
    setError(null);
    startTransition(async () => {
      const result = await answerQuizAction({
        questionId: current.id,
        selfIndex,
        guessIndex
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("self");
      setSelfIndex(null);
      setGuessIndex(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {current ? (
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Pregunta {items.indexOf(current) + 1} de {items.length}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-snug text-ink">{current.text}</h2>
          <p className="mt-3 rounded-xl bg-sand px-4 py-2.5 text-sm text-ink">
            {step === "self"
              ? `Primero tu, ${myName}: cual va contigo?`
              : `Y ahora... que crees que responderá ${partnerName} sobre si misma/o?`}
          </p>
          <div className="mt-4 grid gap-2">
            {current.options.map((option, index) => {
              const selected = step === "self" ? selfIndex === index : guessIndex === index;
              return (
                <button
                  key={index}
                  onClick={() =>
                    step === "self" ? setSelfIndex(index) : setGuessIndex(index)
                  }
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition",
                    selected
                      ? "border-rose bg-rose-faint font-medium text-rose-deep"
                      : "border-sand-deep bg-paper text-ink hover:bg-sand"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            {step === "guess" && (
              <Button variant="ghost" onClick={() => setStep("self")}>
                Atrás
              </Button>
            )}
            {step === "self" ? (
              <Button disabled={selfIndex === null} onClick={() => setStep("guess")}>
                Siguiente
              </Button>
            ) : (
              <Button disabled={guessIndex === null} loading={pending} onClick={submit}>
                Guardar respuesta
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-rose-faint/60 p-6 text-center">
          <Heart className="mx-auto h-8 w-8 fill-rose text-rose" />
          <h2 className="mt-3 font-display text-2xl text-ink">Has respondido todo</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {results.length < items.length
              ? `Cuando ${partnerName} termine, vereis los resultados completos aquí.`
              : "Aquí teneis vuestros resultados."}
          </p>
        </Card>
      )}

      {results.length > 0 && (
        <section>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <p className="font-display text-3xl text-rose-deep">
                {iGuessed}/{results.length}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Aciertos tuyos sobre {partnerName}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="font-display text-3xl text-rose-deep">
                {partnerGuessed}/{results.length}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Aciertos de {partnerName} sobre ti</p>
            </Card>
          </div>
          <div className="space-y-2.5">
            {results.map((item) => {
              const hit = item.mine!.guessIndex === item.partner!.selfIndex;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-sand bg-paper px-4 py-3.5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{item.text}</p>
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        hit ? "bg-emerald-100 text-emerald-700 dark:text-emerald-400" : "bg-red-50 text-red-600"
                      )}
                    >
                      {hit ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    {partnerName} dijo: <span className="font-medium text-ink">{item.options[item.partner!.selfIndex]}</span>
                    {" · "}Tu apostaste por: <span className="font-medium text-ink">{item.options[item.mine!.guessIndex]}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
