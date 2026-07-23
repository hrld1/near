"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Eye, Pencil, RotateCcw, Send } from "lucide-react";
import { drawGameAction } from "@/actions/draw-game";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx, vibrate } from "@/lib/sound";
import { guessMatches, randomWord } from "@/lib/draw-words";
import { DrawSurface, type DrawHandle } from "@/features/canvas/draw-surface";
import { CanvasToolbar } from "@/features/canvas/canvas-toolbar";
import type { CanvasStroke, MemberInfo } from "@/types";

const COLORS = ["#e11d48", "#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#1f2937", "#fbbf24"];
const SIZES = [3, 7, 14];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

type Role = "drawer" | "guesser" | null;
type Phase = "idle" | "playing" | "won";
type GuessLine = { id: string; who: string; text: string; correct: boolean };

// "Dibuja y adivina": uno dibuja en vivo (los trazos viajan por SSE) y el otro
// adivina escribiendo. La palabra solo la conoce quien dibuja; valida el
// acierto en su cliente, así no se filtra a quien adivina.
export function DrawGuess({
  me,
  partnerName,
  initialStart,
  onConsumed
}: {
  me: MemberInfo;
  partnerName: string;
  initialStart?: { roundId: string } | null;
  onConsumed?: () => void;
}) {
  const surface = useRef<DrawHandle>(null);
  const roundRef = useRef<{ id: string; word: string } | null>(null);
  const lastSent = useRef(0);

  // reto recibido: la pareja dibuja, yo entro como quien adivina
  useEffect(() => {
    if (initialStart) {
      roundRef.current = { id: initialStart.roundId, word: "" };
      setRole("guesser");
      setPhase("playing");
      onConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [role, setRole] = useState<Role>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [word, setWord] = useState(""); // solo se muestra a quien dibuja (o al final)
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [guess, setGuess] = useState("");
  const [lines, setLines] = useState<GuessLine[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  function startAsDrawer() {
    const id = uid();
    const w = randomWord(word);
    roundRef.current = { id, word: w };
    setRole("drawer");
    setPhase("playing");
    setWord(w);
    setLines([]);
    setWinner(null);
    surface.current?.clear();
    void drawGameAction({ kind: "start", mode: "guess", roundId: id }); // sin palabra
  }

  function onLocalStroke(s: CanvasStroke, done: boolean) {
    if (role !== "drawer" || !roundRef.current) return;
    const now = Date.now();
    if (!done && now - lastSent.current < 70) return;
    lastSent.current = now;
    void drawGameAction({
      kind: "stroke",
      mode: "guess",
      roundId: roundRef.current.id,
      stroke: { ...s, points: [...s.points] }
    });
  }

  function clearDrawing() {
    surface.current?.clear();
    if (roundRef.current) void drawGameAction({ kind: "clear", mode: "guess", roundId: roundRef.current.id });
  }

  function sendGuess() {
    const text = guess.trim();
    if (!text || !roundRef.current || phase !== "playing") return;
    setGuess("");
    setLines((prev) => [...prev, { id: uid(), who: "Tú", text, correct: false }].slice(-8));
    void drawGameAction({ kind: "guess", mode: "guess", roundId: roundRef.current.id, guess: text });
  }

  useCoupleStream((event) => {
    if (event.type !== "draw:game" || event.payload.mode !== "guess") return;
    const p = event.payload;
    if (p.byId === me.id) return;

    if (p.kind === "start") {
      // la pareja dibuja → yo adivino
      roundRef.current = { id: p.roundId, word: "" };
      setRole("guesser");
      setPhase("playing");
      setWord("");
      setLines([]);
      setWinner(null);
      surface.current?.clear();
    }
    if (p.kind === "stroke" && p.stroke && roundRef.current?.id === p.roundId) {
      surface.current?.applyRemoteStroke(p.stroke);
    }
    if (p.kind === "clear" && roundRef.current?.id === p.roundId) {
      surface.current?.clear();
    }
    if (p.kind === "guess" && p.guess && roundRef.current) {
      // soy quien dibuja: registro el intento y valido contra la palabra
      setLines((prev) => [...prev, { id: uid(), who: partnerName, text: p.guess!, correct: false }].slice(-8));
      if (role === "drawer" && guessMatches(p.guess, roundRef.current.word)) {
        setWinner(partnerName);
        setPhase("won");
        sfx.success();
        void drawGameAction({
          kind: "correct",
          mode: "guess",
          roundId: roundRef.current.id,
          word: roundRef.current.word,
          guess: p.guess
        });
      }
    }
    if (p.kind === "correct" && roundRef.current?.id === p.roundId) {
      // soy quien adivina y he acertado
      setWinner("Tú");
      setWord(p.word ?? "");
      setPhase("won");
      sfx.success();
      vibrate(30);
    }
  });

  if (phase === "idle") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-3xl border border-sand bg-paper p-8 text-center shadow-card">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
          <Pencil className="h-8 w-8" />
        </span>
        <div>
          <h2 className="font-display text-2xl text-ink">Dibuja y adivina</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Tú dibujas una palabra secreta y {partnerName} intenta adivinarla
            mientras te ve dibujar. Luego cambiáis.
          </p>
        </div>
        <button
          onClick={startAsDrawer}
          className="rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-deep"
        >
          Yo dibujo primero
        </button>
      </div>
    );
  }

  const isDrawer = role === "drawer";

  return (
    <div className="flex flex-col gap-3">
      {/* cabecera de rol / estado */}
      <div className="flex items-center justify-between rounded-2xl border border-sand bg-paper px-4 py-2.5 shadow-card">
        {phase === "won" ? (
          <p className="text-sm font-medium text-ink">
            {winner === "Tú" ? "¡Has acertado!" : `¡${winner} lo ha adivinado!`}
            <span className="ml-2 text-ink-soft">era “{word}”</span>
          </p>
        ) : isDrawer ? (
          <p className="flex items-center gap-2 text-sm text-ink">
            <Pencil className="h-4 w-4 text-rose" /> Dibuja: <b className="font-display text-lg text-rose-deep">{word}</b>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink">
            <Eye className="h-4 w-4 text-sky-500" /> Adivina lo que dibuja {partnerName}
          </p>
        )}
        {phase === "won" && (
          <button
            onClick={startAsDrawer}
            className="flex items-center gap-1.5 rounded-full bg-rose px-4 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep"
          >
            <RotateCcw className="h-4 w-4" /> {isDrawer ? "Otra" : "Ahora dibujo yo"}
          </button>
        )}
      </div>

      {isDrawer && phase === "playing" && (
        <CanvasToolbar
          colors={COLORS}
          sizes={SIZES}
          color={color}
          size={size}
          onColor={setColor}
          onSize={setSize}
          right={
            <button
              onClick={clearDrawing}
              className="flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-sand hover:text-ink"
            >
              <Eraser className="h-4 w-4" /> Borrar
            </button>
          }
        />
      )}

      <DrawSurface
        ref={surface}
        color={color}
        size={size}
        readOnly={!isDrawer || phase !== "playing"}
        onLocalStroke={onLocalStroke}
        className="aspect-[4/3] w-full rounded-3xl border border-rose/15 shadow-card"
      />

      {/* intentos */}
      {(lines.length > 0 || (!isDrawer && phase === "playing")) && (
        <div className="rounded-2xl border border-sand bg-paper p-3 shadow-card">
          {lines.length > 0 && (
            <ul className="mb-2 max-h-28 space-y-1 overflow-y-auto text-sm">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <span className="font-medium text-ink-soft">{l.who}:</span>
                  <span className={l.correct ? "font-semibold text-emerald-600" : "text-ink"}>{l.text}</span>
                  {l.correct && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </li>
              ))}
            </ul>
          )}
          {!isDrawer && phase === "playing" && (
            <div className="flex items-center gap-2">
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendGuess()}
                placeholder="¿Qué está dibujando?"
                className="min-w-0 flex-1 rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none"
              />
              <button
                onClick={sendGuess}
                disabled={!guess.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-rose px-3.5 py-2 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
