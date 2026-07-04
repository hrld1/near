"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EMOJIS = ["💌", "🌙", "✈️", "🎬", "🍕", "🎧", "📷", "🔥"];

type CardState = { id: number; emoji: string; matched: boolean };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function MemoryGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [cards] = useState<CardState[]>(() =>
    shuffle([...EMOJIS, ...EMOJIS].map((emoji, id) => ({ id, emoji, matched: false })))
  );
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());
  const lockRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((Date.now() - startRef.current) / 1000), 250);
    return () => clearInterval(t);
  }, []);

  function flip(index: number) {
    if (lockRef.current || open.includes(index) || matched.has(index)) return;
    const nextOpen = [...open, index];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (cards[a].emoji === cards[b].emoji) {
        const nextMatched = new Set(matched);
        nextMatched.add(a);
        nextMatched.add(b);
        setMatched(nextMatched);
        setOpen([]);
        if (nextMatched.size === cards.length) {
          const elapsed = (Date.now() - startRef.current) / 1000;
          const score = Math.round((elapsed + (moves + 1) * 0.5) * 10) / 10;
          setTimeout(() => onFinish(score), 700);
        }
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setOpen([]);
          lockRef.current = false;
        }, 750);
      }
    }
  }

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 p-5">
      <div className="flex gap-5 text-xs font-medium uppercase tracking-wide text-ink-soft">
        <span>⏱ {seconds.toFixed(1)}s</span>
        <span>giros: {moves}</span>
        <span>parejas: {matched.size / 2}/8</span>
      </div>
      <div className="grid w-full max-w-sm grid-cols-4 gap-2">
        {cards.map((card, index) => {
          const visible = open.includes(index) || matched.has(index);
          return (
            <button
              key={card.id}
              onClick={() => flip(index)}
              className={cn(
                "aspect-square rounded-xl border text-2xl transition-all duration-200",
                visible
                  ? "border-rose/40 bg-rose-faint"
                  : "border-sand-deep bg-paper hover:bg-sand",
                matched.has(index) && "scale-95 opacity-70"
              )}
            >
              <span className={visible ? "animate-pop-in inline-block" : "opacity-0"}>
                {card.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
