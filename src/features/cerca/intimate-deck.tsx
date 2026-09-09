"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useServerState } from "@/hooks/use-server-state";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { answerCardAction } from "@/actions/cards";
import { type DeckLevel, levelRanges } from "@/lib/decks";
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

type DeckMeta = { deckKey: string; name: string; accent: string; tagline: string };

const CONSENT_KEY = "near:intimacy-consent";

// Mazo íntimo con cuidado (it50): a diferencia de un mazo normal, este NO se
// abre solo. Primero pide consentimiento explícito (opt-in, cerrable, privado
// hasta que respondes) y luego revela sus cartas por NIVELES de confianza que
// se abren de uno en uno, solo si la persona elige bajar más. La reciprocidad a
// ciegas del motor de cartas hace el resto: solo ves la respuesta del otro en
// un nivel si tú también has llegado hasta ahí.
export function IntimateDeck({
  deck,
  partnerName,
  levels,
  initial
}: {
  deck: DeckMeta;
  partnerName: string;
  levels: DeckLevel[];
  initial: CardState[];
}) {
  const ranges = levelRanges(levels);
  const [cards, setCards] = useServerState<CardState[]>(initial);
  const [consented, setConsented] = useState(false);
  const [openLevel, setOpenLevel] = useState(0); // nivel más profundo desbloqueado (por sesión)
  const [idx, setIdx] = useState(0);

  // el consentimiento se recuerda por dispositivo para no incordiar, pero la
  // primera entrada siempre es deliberada; el nivel NO se recuerda: cada sesión
  // empiezas en el más suave y eliges bajar (más cuidado con lo explícito).
  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) === "1") setConsented(true);
    } catch {
      /* almacenamiento no disponible: se queda la puerta, sin romper */
    }
  }, []);

  function enter() {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* da igual: entramos igualmente en esta sesión */
    }
    setConsented(true);
  }

  const backLink = (
    <Link
      href="/cerca"
      className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" /> Cerca
    </Link>
  );

  if (!consented) {
    return (
      <div>
        {backLink}
        <div className="rounded-3xl border border-rose/25 bg-gradient-to-br from-rose-faint via-paper to-plum/10 p-6 shadow-card sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl text-ink">{deck.name}, con cuidado</h1>
          <p className="mt-2 text-read text-ink-soft">
            Este rincón es más íntimo. Se abre solo si os apetece a los dos, y a vuestro ritmo.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
              Nadie ve tu respuesta hasta que respondes tú. Sin excepciones.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
              Empieza suave. Los niveles más explícitos se abren solo si tú los abres.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
              Puedes salir cuando quieras. Nada te obliga a seguir.
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={enter}>Entrar con calma</Button>
            <Link href="/cerca" className="text-sm font-medium text-ink-soft transition hover:text-ink">
              Ahora no
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openEnd = ranges[openLevel].end; // cartas visibles ahora
  const visible = cards.slice(0, openEnd);
  const current = visible[idx];
  const currentLevel = ranges.findIndex((r) => idx >= r.start && idx < r.end);
  const revealed = visible.filter((c) => c.myAnswer && c.partnerAnswer).length;
  const canGoDeeper = openLevel < ranges.length - 1;
  const atLevelEnd = current && idx === openEnd - 1;

  function onAnswered(cardId: string, myAnswer: string, partnerAnswer: string | null) {
    setCards((cs) => cs.map((c) => (c.cardId === cardId ? { ...c, myAnswer, partnerAnswer } : c)));
  }

  function openNextLevel() {
    const next = Math.min(ranges.length - 1, openLevel + 1);
    setOpenLevel(next);
    setIdx(ranges[next].start); // llévame a la primera del nivel nuevo
  }

  const go = (delta: number) => setIdx((i) => Math.min(openEnd - 1, Math.max(0, i + delta)));

  return (
    <div>
      {backLink}

      <header className={cn("overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift", deck.accent)}>
        <ShieldCheck className="h-7 w-7" />
        <h1 className="mt-2 font-display text-3xl">{deck.name}</h1>
        <p className="mt-1 max-w-md text-sm text-white/85">{deck.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {ranges.map((r, i) => (
            <span
              key={r.name}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 backdrop-blur-sm",
                i <= openLevel ? "bg-white/25" : "bg-black/20 text-white/60"
              )}
            >
              {i > openLevel && <Lock className="h-3 w-3" />}
              {r.name}
            </span>
          ))}
        </div>
      </header>

      <p className="mt-5 mb-3 text-xs text-ink-soft">
        Respondéis a ciegas: verás la respuesta de {partnerName} en cuanto compartas la tuya.
        {revealed > 0 && ` · ${revealed} reveladas`}
      </p>

      {current && (
        <QuestionStage
          eyebrow={currentLevel >= 0 ? ranges[currentLevel].name : deck.name}
          counter={`${idx + 1} / ${openEnd}`}
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
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {visible.map((c, i) => {
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
                disabled={idx === openEnd - 1}
                aria-label="Pregunta siguiente"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-deep text-ink transition hover:bg-sand disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <IntimateCardBody
            key={current.cardId}
            card={current}
            partnerName={partnerName}
            onAnswered={onAnswered}
          />
        </QuestionStage>
      )}

      {/* bajar de nivel: opt-in explícito, con la advertencia del nivel siguiente */}
      {canGoDeeper && atLevelEnd && (
        <button
          onClick={openNextLevel}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-rose/40 bg-rose-faint/40 px-4 py-3.5 text-left transition hover:border-rose hover:bg-rose-faint"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose/12 text-rose-deep">
            <ChevronDown className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Bajar al nivel «{ranges[openLevel + 1].name}»</span>
            <span className="block text-xs text-ink-soft">{ranges[openLevel + 1].note}</span>
          </span>
        </button>
      )}

      {!canGoDeeper && atLevelEnd && (
        <p className="mt-5 text-center text-sm font-medium text-rose-deep">
          Habéis llegado hasta el fondo de este mazo, a vuestro ritmo.
        </p>
      )}
    </div>
  );
}

function IntimateCardBody({
  card,
  partnerName,
  onAnswered
}: {
  card: CardState;
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

  if (card.myAnswer) {
    return <Reveal myAnswer={card.myAnswer} partnerAnswer={card.partnerAnswer} partnerName={partnerName} />;
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
