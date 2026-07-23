"use client";

import { useState } from "react";
import { useServerState } from "@/hooks/use-server-state";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { answerCardAction } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { QuestionStage, Reveal } from "@/features/questions/question-stage";
import { cn } from "@/lib/utils";

type CardState = {
  cardId: string;
  text: string;
  myAnswer: string | null;
  partnerAnswered: boolean;
  partnerAnswer: string | null;
};

type DeckMeta = { name: string; emoji: string; accent: string; tagline: string; intimate?: boolean };

export function DeckView({
  deck,
  partnerName,
  initial
}: {
  deck: DeckMeta;
  partnerName: string;
  initial: CardState[];
}) {
  const [cards, setCards] = useServerState<CardState[]>(initial);
  // Carta a carta (it33): una sola pregunta en grande, se avanza a mano.
  const [idx, setIdx] = useState(0);
  const revealed = cards.filter((c) => c.myAnswer && c.partnerAnswer).length;
  const mineDone = cards.filter((c) => c.myAnswer).length;
  const current = cards[idx];

  function onAnswered(cardId: string, myAnswer: string, partnerAnswer: string | null) {
    setCards((cs) => cs.map((c) => (c.cardId === cardId ? { ...c, myAnswer, partnerAnswer } : c)));
  }

  const go = (delta: number) => setIdx((i) => Math.min(cards.length - 1, Math.max(0, i + delta)));

  return (
    <div>
      <Link
        href="/cerca"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Cerca
      </Link>

      <header className={cn("overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift", deck.accent)}>
        <p className="text-3xl">{deck.emoji}</p>
        <h1 className="mt-1 font-display text-3xl">{deck.name}</h1>
        <p className="mt-1 max-w-md text-sm text-white/85">{deck.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-black/20 px-3 py-1 backdrop-blur-sm">
            {revealed} de {cards.length} reveladas
          </span>
          {deck.intimate && (
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">Íntimo · con confianza</span>
          )}
        </div>
      </header>

      <p className="mt-5 mb-3 text-xs text-ink-soft">
        Respondéis a ciegas: verás la respuesta de {partnerName} en cuanto compartas la tuya.
      </p>

      {current && (
        <QuestionStage
          eyebrow={deck.name}
          counter={`${idx + 1} / ${cards.length}`}
          question={current.text}
          nav={
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={idx === 0}
                aria-label="Pregunta anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-deep text-ink transition hover:bg-sand disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* puntos: relleno = revelada, aro = respondida por ti, hueco = pendiente */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {cards.map((c, i) => {
                  const done = !!(c.myAnswer && c.partnerAnswer);
                  const mine = !!c.myAnswer;
                  return (
                    <button
                      key={c.cardId}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-label={`Ir a la pregunta ${i + 1}`}
                      className={cn(
                        "h-2 w-2 rounded-full transition",
                        i === idx && "ring-2 ring-rose ring-offset-1 ring-offset-paper",
                        done ? "bg-rose" : mine ? "border border-rose bg-transparent" : "bg-sand-deep"
                      )}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => go(1)}
                disabled={idx === cards.length - 1}
                aria-label="Pregunta siguiente"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-deep text-ink transition hover:bg-sand disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          {/* key = reinicia el estado del formulario al cambiar de carta */}
          <CardBody
            key={current.cardId}
            card={current}
            partnerName={partnerName}
            hasNext={idx < cards.length - 1}
            onAnswered={onAnswered}
            onNext={() => go(1)}
          />
        </QuestionStage>
      )}

      {mineDone === cards.length && (
        <p className="mt-5 text-center text-sm font-medium text-rose-deep">
          Habéis abierto todo este mazo. Probad otro cuando queráis 💞
        </p>
      )}
    </div>
  );
}

function CardBody({
  card,
  partnerName,
  hasNext,
  onAnswered,
  onNext
}: {
  card: CardState;
  partnerName: string;
  hasNext: boolean;
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
    const res = await answerCardAction({ cardId: card.cardId, answer: text });
    if (res.ok && res.data) {
      onAnswered(card.cardId, text, res.data.partnerAnswer);
      setAnswer("");
    } else if (!res.ok) {
      setError(res.error);
    }
    setSaving(false);
  }

  if (card.myAnswer) {
    return (
      <div className="space-y-3">
        <Reveal myAnswer={card.myAnswer} partnerAnswer={card.partnerAnswer} partnerName={partnerName} />
        {hasNext && (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={onNext}>
              Siguiente pregunta
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          {card.partnerAnswered
            ? `${partnerName} ya respondió: responde para verla`
            : "La respuesta del otro se revela al responder"}
        </p>
        <Button onClick={submit} loading={saving} disabled={!answer.trim()}>
          Responder
        </Button>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
