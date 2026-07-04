"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TIME_PER_WORD = 45;
const SKIP_PENALTY = 10;

export function AnagramGame({
  words,
  onFinish
}: {
  words: { word: string; scrambled: string }[];
  onFinish: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const scoreRef = useRef(0);
  const startRef = useRef(Date.now());

  const current = words[index];

  useEffect(() => {
    startRef.current = Date.now();
    setTimeLeft(TIME_PER_WORD);
    const t = setInterval(() => {
      const left = TIME_PER_WORD - (Date.now() - startRef.current) / 1000;
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(t);
        advance(0);
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function advance(gained: number) {
    scoreRef.current = Math.max(0, scoreRef.current + gained);
    setScore(scoreRef.current);
    if (index + 1 >= words.length) {
      setTimeout(() => onFinish(scoreRef.current), 700);
    } else {
      setIndex((i) => i + 1);
      setGuess("");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    if (guess.trim().toLowerCase() === current.word.toLowerCase()) {
      setFlash("ok");
      setTimeout(() => setFlash(null), 400);
      advance(Math.ceil(timeLeft));
    } else {
      setFlash("bad");
      setTimeout(() => setFlash(null), 400);
    }
  }

  if (!current) return null;

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-5 p-6">
      <div className="flex w-full max-w-xs items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-soft">
        <span>
          Palabra {index + 1}/{words.length}
        </span>
        <span>{score} pts</span>
        <span className={timeLeft < 10 ? "font-bold text-red-600" : ""}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>

      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-rose transition-all duration-200"
          style={{ width: `${(timeLeft / TIME_PER_WORD) * 100}%` }}
        />
      </div>

      <div
        className={cn(
          "flex flex-wrap justify-center gap-1.5",
          flash === "bad" && "animate-shake",
          flash === "ok" && "animate-pop-in"
        )}
      >
        {current.scrambled.split("").map((letter, i) => (
          <span
            key={i}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-sand-deep bg-paper font-display text-2xl uppercase text-ink shadow-card"
          >
            {letter}
          </span>
        ))}
      </div>

      <form onSubmit={submit} className="flex w-full max-w-xs gap-2">
        <Input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Tu respuesta..."
          autoFocus
          autoComplete="off"
          className="text-center lowercase tracking-widest"
        />
        <Button type="submit" disabled={!guess.trim()}>
          Va
        </Button>
      </form>
      <button
        onClick={() => advance(-SKIP_PENALTY)}
        className="text-xs text-ink-soft underline-offset-2 hover:underline"
      >
        Pasar (-{SKIP_PENALTY} pts)
      </button>
    </div>
  );
}
