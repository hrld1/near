"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
          // Galería de tiro en penumbra: antes era un lavanda pálido plano,
          // desentonaba junto al resto de la arcade (todo oscuro y con
          // atmósfera desde Meteoros). Un foco radial + viñeta + trama de
          // puntos en vez de rayas — mismo espíritu que el cielo estrellado
          // de Meteoros, sin tocar la lógica del juego.
          background:
            "radial-gradient(ellipse 70% 55% at 50% 38%, rgb(var(--c-plum) / 0.55), transparent 70%), " +
            "radial-gradient(ellipse 120% 90% at 50% 100%, rgba(0,0,0,0.45), transparent 60%), " +
            "radial-gradient(circle at 2px 2px, rgb(var(--c-plum) / 0.35) 1px, transparent 0) 0 0 / 22px 22px, " +
            "#100a1c"
        }}
      >
        {targets.map((target) => {
          const age = (Date.now() - target.bornAt) / TARGET_LIFE;
          const size = Math.max(24, 58 * (1 - age * 0.7));
          // se acerca a desaparecer (y a valer el doble): el halo se aviva
          // en vez de solo encoger, para que la urgencia se VEA, no solo se
          // intuya por el tamaño.
          const urgent = age > 0.55;
          return (
            <button
              key={target.id}
              onPointerDown={(e) => hit(target, e)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform active:scale-90",
                urgent && "motion-safe:animate-pulse"
              )}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: size,
                height: size,
                // diana real: anillos concentricos blanco/rojo
                background:
                  "radial-gradient(circle, #ef4444 0 19%, #ffffff 19% 40%, #ef4444 40% 61%, #ffffff 61% 80%, #dc2626 80% 100%)",
                boxShadow: urgent
                  ? "0 3px 10px rgba(0,0,0,0.4), 0 0 18px 4px rgba(251,191,36,0.55), inset 0 -2px 4px rgba(0,0,0,0.15)"
                  : "0 3px 10px rgba(0,0,0,0.4), 0 0 14px 2px rgba(239,68,68,0.35), inset 0 -2px 4px rgba(0,0,0,0.15)"
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
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pop-in text-base font-bold text-white"
            style={{ left: `${pop.x}%`, top: `${pop.y}%`, textShadow: "0 0 10px rgba(251,191,36,0.9), 0 1px 3px rgba(0,0,0,0.6)" }}
          >
            +{pop.value}
          </span>
        ))}
      </div>
    </div>
  );
}
