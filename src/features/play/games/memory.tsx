"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Heart, Repeat2, Sparkles } from "lucide-react";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

// Parejas, versión pulida: cartas con volteo 3D real, dorso con degradado y
// corazón, brillo verde y destello al emparejar. Mismo scoring que antes
// (tiempo en segundos + medio punto por giro; menos es mejor).

const EMOJIS = ["💌", "🌙", "✈️", "🎬", "🍕", "🎧", "📷", "🔥"];

type CardState = { id: number; emoji: string };

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
    shuffle([...EMOJIS, ...EMOJIS].map((emoji, id) => ({ id, emoji })))
  );
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [justMatched, setJustMatched] = useState<Set<number>>(new Set());
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
    sfx.pad(index % 4);
    if (nextOpen.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (cards[a].emoji === cards[b].emoji) {
        const nextMatched = new Set(matched);
        nextMatched.add(a);
        nextMatched.add(b);
        setMatched(nextMatched);
        setJustMatched(new Set([a, b]));
        setTimeout(() => setJustMatched(new Set()), 800);
        setOpen([]);
        sfx.success();
        if (nextMatched.size === cards.length) {
          const elapsed = (Date.now() - startRef.current) / 1000;
          const score = Math.round((elapsed + (moves + 1) * 0.5) * 10) / 10;
          setTimeout(() => onFinish(score), 800);
        }
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setOpen([]);
          lockRef.current = false;
        }, 800);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-2 text-xs font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-ink-soft">
          <Clock className="h-3.5 w-3.5" /> {seconds.toFixed(1)}s
        </span>
        <span className="flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-ink-soft">
          <Repeat2 className="h-3.5 w-3.5" /> {moves}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-rose-faint px-3 py-1 text-rose-deep">
          <Heart className="h-3.5 w-3.5 fill-current" /> {matched.size / 2}/8
        </span>
      </div>

      <div className="grid w-full max-w-sm grid-cols-4 gap-2.5" style={{ perspective: "900px" }}>
        {cards.map((card, index) => {
          const visible = open.includes(index) || matched.has(index);
          const isMatched = matched.has(index);
          return (
            <button
              key={card.id}
              onClick={() => flip(index)}
              className="relative aspect-square"
              aria-label="Carta"
            >
              <span
                className="relative block h-full w-full transition-transform duration-500"
                style={{ transformStyle: "preserve-3d", transform: visible ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* dorso */}
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum shadow-card"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Heart className="h-6 w-6 text-white/70" />
                </span>
                {/* cara */}
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-2xl border bg-paper text-3xl transition",
                    isMatched
                      ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]"
                      : "border-sand-deep"
                  )}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {card.emoji}
                </span>
              </span>

              {/* destello al emparejar */}
              {justMatched.has(index) && (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-emerald-400 motion-safe:animate-ping" />
                  <Sparkles className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 animate-pop-in text-amber-400" />
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-ink-soft">
        Encuentra las 8 parejas. Cuanto menos tardes y menos giros, mejor marca.
      </p>
    </div>
  );
}
