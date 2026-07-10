"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Reflejos, versión canvas: un reactor que carga en calma y, cuando se
// ENCIENDE, hay que tocar cuanto antes. Ondas expansivas, estallido de
// partículas y lectura grande de milisegundos. 5 rondas, cuenta la media;
// tocar antes de tiempo penaliza. Mismo scoring que antes (sin tocar el registro).

const W = 400;
const H = 380;
const ROUNDS = 5;
const PENALTY_MS = 800;

type Status = "waiting" | "armed" | "early" | "hit";

export function ReactionGame({ onFinish }: { onFinish: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(1);
  const [times, setTimes] = useState<number[]>([]);

  const s = useRef({
    status: "waiting" as Status,
    armedAt: 0,
    lastMs: null as number | null,
    round: 1,
    times: [] as number[],
    ripples: [] as { r: number; max: number; life: number; color: string }[],
    parts: [] as Particle[],
    pulse: 0,
    done: false
  });
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;

    function arm() {
      st.status = "waiting";
      st.lastMs = null;
      armTimer.current = setTimeout(() => {
        st.status = "armed";
        st.armedAt = performance.now();
        st.ripples.push({ r: 40, max: 260, life: 1, color: "#34d399" });
      }, 1000 + Math.random() * 2200);
    }

    function record(ms: number) {
      st.times = [...st.times, ms];
      st.lastMs = ms;
      setTimes(st.times);
      if (st.times.length >= ROUNDS) {
        const avg = st.times.reduce((a, b) => a + b, 0) / st.times.length;
        if (!st.done) {
          st.done = true;
          setTimeout(() => onFinishRef.current(Math.round(avg)), 950);
        }
      } else {
        setTimeout(() => {
          st.round += 1;
          setRound(st.round);
          arm();
        }, 950);
      }
    }

    function tap() {
      if (st.status === "waiting") {
        if (armTimer.current) clearTimeout(armTimer.current);
        st.status = "early";
        st.ripples.push({ r: 20, max: 200, life: 1, color: "#f87171" });
        setTimeout(() => record(PENALTY_MS), 750);
        return;
      }
      if (st.status === "armed") {
        const ms = Math.round(performance.now() - st.armedAt);
        st.status = "hit";
        st.lastMs = ms;
        spawnBurst(st.parts, W / 2, H / 2, ["#34d399", "#a7f3d0", "#ffffff", "#fbbf24"], 30, 4.5);
        record(ms);
      }
    }

    const coreColor = () => {
      switch (st.status) {
        case "armed":
          return { a: "#6ee7b7", b: "#059669", glow: "#34d399" };
        case "early":
          return { a: "#fca5a5", b: "#dc2626", glow: "#f87171" };
        case "hit":
          return { a: "#fecdd3", b: "#e11d48", glow: "#fb7185" };
        default:
          return { a: "#c4b5fd", b: "#6d28d9", glow: "#8b5cf6" }; // waiting (calma)
      }
    };

    function frame(now: number) {
      st.pulse += 0.05;
      // fondo
      const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H * 0.7);
      const dark = st.status === "armed" ? "#062b22" : "#140b2e";
      bg.addColorStop(0, st.status === "armed" ? "#0b3b2e" : "#1c1140");
      bg.addColorStop(1, dark);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ondas
      for (const rp of st.ripples) {
        rp.r += 4;
        rp.life -= 0.02;
        ctx.globalAlpha = Math.max(0, rp.life) * 0.6;
        ctx.strokeStyle = rp.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      st.ripples = st.ripples.filter((rp) => rp.life > 0 && rp.r < rp.max);

      // núcleo
      const c = coreColor();
      const baseR = st.status === "armed" ? 78 : 58;
      const r = baseR + Math.sin(st.pulse) * (st.status === "waiting" ? 5 : 9);
      ctx.save();
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = st.status === "armed" ? 50 : 26;
      const g = ctx.createRadialGradient(W / 2 - 12, H / 2 - 12, 4, W / 2, H / 2, r);
      g.addColorStop(0, c.a);
      g.addColorStop(1, c.b);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      stepParticles(ctx, st.parts);

      // texto
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      if (st.status === "waiting") {
        ctx.font = "600 20px Georgia, serif";
        ctx.fillText("Espera…", W / 2, H / 2 + 7);
      } else if (st.status === "armed") {
        ctx.font = "bold 30px Georgia, serif";
        ctx.fillText("¡AHORA!", W / 2, H / 2 + 10);
      } else if (st.status === "early") {
        ctx.font = "600 18px Georgia, serif";
        ctx.fillText("Muy pronto", W / 2, H / 2 + 6);
      } else if (st.status === "hit" && st.lastMs !== null) {
        ctx.font = "bold 34px Georgia, serif";
        ctx.fillText(`${st.lastMs} ms`, W / 2, H / 2 + 12);
      }

      // HUD ronda
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Ronda ${Math.min(st.round, ROUNDS)} / ${ROUNDS}`, 14, 24);
      if (st.times.length > 0) {
        ctx.textAlign = "right";
        ctx.fillText(st.times.map((t) => `${t}`).join(" · ") + " ms", W - 14, 24);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    arm();

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      tap();
    };
    canvas.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(raf);
      if (armTimer.current) clearTimeout(armTimer.current);
      canvas.removeEventListener("pointerdown", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Zap className="h-4 w-4 text-emerald-500" /> Reflejos
        </span>
        <span className="text-ink-soft">
          Ronda <b className="text-ink">{Math.min(round, ROUNDS)}</b>/{ROUNDS} · {times.length} hechas
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#140b2e" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Toca en cuanto el núcleo se ponga verde. Ni antes… ni tarde.
      </p>
    </div>
  );
}
