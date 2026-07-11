"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";

const DURATION = 30;
const TARGET_LIFE = 1500;

type Target = { id: number; x: number; y: number; bornAt: number };

export function TargetsGame({ onFinish, onProgress }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const spawn = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed >= DURATION) return;
      idRef.current += 1;
      const target: Target = {
        id: idRef.current,
        x: 8 + Math.random() * 84,
        y: 10 + Math.random() * 78,
        bornAt: Date.now()
      };
      setTargets((prev) => [...prev.filter((t) => Date.now() - t.bornAt < TARGET_LIFE), target]);
      const interval = Math.max(420, 750 - elapsed * 10);
      spawnTimer = setTimeout(spawn, interval);
    };
    let spawnTimer = setTimeout(spawn, 300);

    const clock = setInterval(() => {
      const left = Math.max(0, DURATION - (Date.now() - startedAt) / 1000);
      setTimeLeft(left);
      setTargets((prev) => prev.filter((t) => Date.now() - t.bornAt < TARGET_LIFE));
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(clock);
        clearTimeout(spawnTimer);
        setTimeout(() => onFinish(scoreRef.current), 600);
      }
    }, 100);

    return () => {
      clearInterval(clock);
      clearTimeout(spawnTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hit(target: Target, e: React.PointerEvent) {
    e.stopPropagation();
    const age = Date.now() - target.bornAt;
    const small = age > TARGET_LIFE * 0.55;
    const value = small ? 2 : 1;
    scoreRef.current += value;
    setScore(scoreRef.current);
    onProgress?.(scoreRef.current);
    setTargets((prev) => prev.filter((t) => t.id !== target.id));
    const pop = { id: target.id, x: target.x, y: target.y, value };
    setPops((prev) => [...prev.slice(-6), pop]);
    setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== pop.id)), 500);
    const ripple = { id: target.id, x: target.x, y: target.y };
    setRipples((prev) => [...prev.slice(-6), ripple]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 450);
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Target className="h-4 w-4 text-rose" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span
          className={
            timeLeft < 6 ? "font-semibold text-red-600" : "text-ink-soft"
          }
        >
          {timeLeft.toFixed(0)}s
        </span>
      </div>
      <div
        className="relative h-[340px] w-full touch-none select-none overflow-hidden rounded-xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgb(var(--c-plum) / 0.16), rgb(var(--c-plum) / 0.05) 65%), repeating-linear-gradient(45deg, rgb(var(--c-plum) / 0.04) 0 14px, transparent 14px 28px)"
        }}
      >
        {targets.map((target) => {
          const age = (Date.now() - target.bornAt) / TARGET_LIFE;
          const size = Math.max(24, 58 * (1 - age * 0.7));
          return (
            <button
              key={target.id}
              onPointerDown={(e) => hit(target, e)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lift transition-transform active:scale-90"
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: size,
                height: size,
                // diana real: anillos concentricos blanco/rojo
                background:
                  "radial-gradient(circle, #ef4444 0 19%, #ffffff 19% 40%, #ef4444 40% 61%, #ffffff 61% 80%, #dc2626 80% 100%)",
                boxShadow: "0 3px 10px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.15)"
              }}
            />
          );
        })}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-4 border-rose"
            style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, animationDuration: "0.45s" }}
          />
        ))}
        {pops.map((pop) => (
          <span
            key={pop.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pop-in text-sm font-bold text-rose-deep"
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            +{pop.value}
          </span>
        ))}
      </div>
    </div>
  );
}
