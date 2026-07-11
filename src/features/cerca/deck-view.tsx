"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { answerCardAction } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
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
  const [cards, setCards] = useState<CardState[]>(initial);
  const revealed = cards.filter((c) => c.myAnswer && c.partnerAnswer).length;
  const mineDone = cards.filter((c) => c.myAnswer).length;

  function onAnswered(cardId: string, myAnswer: string, partnerAnswer: string | null) {
    setCards((cs) =>
      cs.map((c) => (c.cardId === cardId ? { ...c, myAnswer, partnerAnswer } : c))
    );
  }

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

      <div className="grid gap-3">
        {cards.map((card, i) => (
          <CardItem key={card.cardId} card={card} index={i + 1} partnerName={partnerName} onAnswered={onAnswered} />
        ))}
      </div>

      {mineDone === cards.length && (
        <p className="mt-5 text-center text-sm font-medium text-rose-deep">
          Habéis abierto todo este mazo. Probad otro cuando queráis 💞
        </p>
      )}
    </div>
  );
}

function CardItem({
  card,
  index,
  partnerName,
  onAnswered
}: {
  card: CardState;
  index: number;
  partnerName: string;
  onAnswered: (cardId: string, myAnswer: string, partnerAnswer: string | null) => void;
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

  return (
    <div className="rounded-2xl border border-sand-deep bg-paper p-4 shadow-card">
      <p className="flex gap-2 font-display text-lg leading-snug text-ink">
        <span className="text-ink-soft/50">{index}.</span>
        {card.text}
      </p>

      {card.myAnswer ? (
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl bg-sand px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Tú</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{card.myAnswer}</p>
          </div>
          {card.partnerAnswer ? (
            <div className="rounded-xl bg-rose-faint px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-deep">{partnerName}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{card.partnerAnswer}</p>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              {partnerName} aún no ha respondido. Su respuesta aparecerá aquí.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={2}
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
            <Button size="sm" onClick={submit} loading={saving} disabled={!answer.trim()}>
              Responder
            </Button>
          </div>
          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
