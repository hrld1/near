"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATION = 30;

type Question = { text: string; answer: number; options: number[] };

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeQuestion(): Question {
  const kind = randomInt(0, 2);
  let a: number, b: number, answer: number, text: string;
  if (kind === 0) {
    a = randomInt(11, 89);
    b = randomInt(11, 89);
    answer = a + b;
    text = `${a} + ${b}`;
  } else if (kind === 1) {
    a = randomInt(30, 99);
    b = randomInt(11, a - 10);
    answer = a - b;
    text = `${a} − ${b}`;
  } else {
    a = randomInt(3, 12);
    b = randomInt(3, 12);
    answer = a * b;
    text = `${a} × ${b}`;
  }
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const delta = randomInt(1, 10) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0) options.add(candidate);
  }
  return { text, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

export function SprintGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [question, setQuestion] = useState<Question>(() => makeQuestion());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [flash, setFlash] = useState<"ok" | "fail" | null>(null);
  const scoreRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
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

  function pick(option: number) {
    if (doneRef.current) return;
    const correct = option === question.answer;
    scoreRef.current = Math.max(0, scoreRef.current + (correct ? 1 : -1));
    setScore(scoreRef.current);
    setFlash(correct ? "ok" : "fail");
    setTimeout(() => setFlash(null), 250);
    setQuestion(makeQuestion());
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Calculator className="h-4 w-4 text-fuchsia-500" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span className={timeLeft < 6 ? "font-semibold text-red-600" : "text-ink-soft"}>
          {timeLeft.toFixed(0)}s
        </span>
      </div>
      <div
        className={cn(
          "flex h-[340px] flex-col items-center justify-center gap-8 rounded-xl transition-colors",
          flash === "ok" && "bg-emerald-500/10",
          flash === "fail" && "bg-red-500/10",
          !flash && "bg-fuchsia-500/5"
        )}
      >
        <p className="font-display text-5xl tabular-nums text-ink">{question.text}</p>
        <div className="grid w-full max-w-xs grid-cols-2 gap-2.5">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => pick(option)}
              className="rounded-2xl border border-sand-deep bg-paper py-3.5 font-display text-2xl tabular-nums text-ink shadow-card transition hover:border-fuchsia-400 hover:text-fuchsia-600 active:scale-95"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
