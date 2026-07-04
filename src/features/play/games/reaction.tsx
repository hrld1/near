"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ROUNDS = 5;
const PENALTY_MS = 800;

type Status = "waiting" | "armed" | "early" | "hit";

export function ReactionGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState<Status>("waiting");
  const [times, setTimes] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const armedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    arm();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function arm() {
    setStatus("waiting");
    setLastMs(null);
    timerRef.current = setTimeout(() => {
      armedAtRef.current = performance.now();
      setStatus("armed");
    }, 1000 + Math.random() * 2200);
  }

  function record(ms: number) {
    const next = [...times, ms];
    setTimes(next);
    setLastMs(ms);
    if (next.length >= ROUNDS) {
      const avg = next.reduce((a, b) => a + b, 0) / next.length;
      setTimeout(() => onFinish(Math.round(avg)), 900);
    } else {
      setTimeout(() => setRound((r) => r + 1), 900);
    }
  }

  function tap() {
    if (status === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("early");
      setTimeout(() => record(PENALTY_MS), 700);
      return;
    }
    if (status === "armed") {
      const ms = Math.round(performance.now() - armedAtRef.current);
      setStatus("hit");
      record(ms);
    }
  }

  return (
    <button
      onPointerDown={tap}
      className={cn(
        "flex min-h-[380px] w-full select-none flex-col items-center justify-center gap-3 transition-colors duration-150",
        status === "waiting" && "bg-plum/15",
        status === "armed" && "bg-emerald-400/80",
        status === "early" && "animate-shake bg-red-400/70",
        status === "hit" && "bg-rose-faint"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Ronda {Math.min(round, ROUNDS)} / {ROUNDS}
      </p>
      {status === "waiting" && <p className="font-display text-3xl text-ink">Espera...</p>}
      {status === "armed" && <p className="font-display text-3xl text-ink">AHORA!</p>}
      {status === "early" && (
        <p className="font-display text-2xl text-ink">Demasiado pronto 😅 +{PENALTY_MS}ms</p>
      )}
      {status === "hit" && lastMs !== null && (
        <p className="animate-pop-in font-display text-4xl text-rose-deep">{lastMs} ms</p>
      )}
      {times.length > 0 && (
        <p className="text-xs text-ink-soft">{times.map((t) => `${t}ms`).join(" · ")}</p>
      )}
    </button>
  );
}
