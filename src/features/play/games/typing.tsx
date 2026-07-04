"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { WORDS } from "@/lib/games";
import { cn } from "@/lib/utils";

const DURATION = 45;

function shuffled(): string[] {
  return [...WORDS].sort(() => Math.random() - 0.5);
}

export function TypingGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [queue, setQueue] = useState<string[]>(() => shuffled());
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [shake, setShake] = useState(false);
  const scoreRef = useRef(0);
  const doneRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const word = queue[index % queue.length];

  useEffect(() => {
    inputRef.current?.focus();
    const startedAt = Date.now();
    const clock = setInterval(() => {
      const left = Math.max(0, DURATION - (Date.now() - startedAt) / 1000);
      setTimeLeft(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(clock);
        setTimeout(() => onFinish(scoreRef.current), 600);
      }
    }, 100);
    return () => clearInterval(clock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitWord(candidate: string) {
    if (doneRef.current || !candidate) return;
    if (candidate.toLowerCase() === word) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      const next = index + 1;
      if (next >= queue.length) {
        setQueue(shuffled());
        setIndex(0);
      } else {
        setIndex(next);
      }
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
    setValue("");
  }

  // Aciertos por cada letra ya correcta (feedback visual mientras tecleas)
  const typed = value.trim().toLowerCase();
  const matches = word.startsWith(typed);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Keyboard className="h-4 w-4 text-cyan-500" />
          <span className="font-display text-xl">{score}</span> palabras
        </span>
        <span className={timeLeft < 6 ? "font-semibold text-red-600" : "text-ink-soft"}>
          {timeLeft.toFixed(0)}s
        </span>
      </div>
      <div className="flex h-[340px] flex-col items-center justify-center gap-7 rounded-xl bg-cyan-500/5">
        <p
          className={cn(
            "font-display text-5xl tracking-wide transition-colors",
            typed.length === 0 ? "text-ink" : matches ? "text-cyan-600" : "text-red-500",
            shake && "animate-shake"
          )}
        >
          {word}
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            // espacio tambien confirma (fluye mejor al teclear rapido)
            if (e.target.value.endsWith(" ")) {
              submitWord(e.target.value.trim());
              return;
            }
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitWord(value.trim());
          }}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="Teclea aqui..."
          className="w-full max-w-xs rounded-2xl border border-sand-deep bg-paper px-4 py-3 text-center font-display text-2xl text-ink shadow-card focus:border-cyan-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
