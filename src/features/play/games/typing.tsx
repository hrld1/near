"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { WORDS } from "@/lib/games";
import { sfx, vibrate } from "@/lib/sound";
import { setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Teclas, versión arcade: un escenario en canvas muestra la palabra como
// teclas de neón que se ENCIENDEN letra a letra según tecleas; al completarla
// estalla en partículas y encadena COMBO (vistoso). El teclado necesita un
// <input> real (sobre todo en móvil), así que va debajo, con estilo. El
// scoring es idéntico al original: +1 por palabra, 45 s.

const W = 400;
const H = 300;
const DURATION = 45;

type Pop = { x: number; y: number; text: string; life: number; vy: number; color: string };

function shuffled(): string[] {
  return [...WORDS].sort(() => Math.random() - 0.5);
}

export function TypingGame({ onFinish, onProgress }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const s = useRef({
    queue: shuffled(),
    index: 0,
    typed: "",
    score: 0,
    combo: 0,
    parts: [] as Particle[],
    pops: [] as Pop[],
    shake: 0,
    startedAt: 0,
    done: false
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    st.startedAt = performance.now();
    inputRef.current?.focus();
    let raf = 0;

    function word() {
      return st.queue[st.index % st.queue.length];
    }

    function frame(now: number) {
      const elapsed = (now - st.startedAt) / 1000;
      const timeLeft = Math.max(0, DURATION - elapsed);
      if (timeLeft <= 0 && !st.done) {
        st.done = true;
        setTimeout(() => onFinishRef.current(st.score), 700);
      }
      st.shake = Math.max(0, st.shake - 0.9);

      const w = word();
      const typed = st.typed;
      const prefixOk = w.startsWith(typed);

      ctx.save();
      if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);

      // fondo neón cian/índigo
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#062a3a");
      bg.addColorStop(1, "#0a1230");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      const glow = ctx.createRadialGradient(W / 2, 150, 20, W / 2, 150, 220);
      const heat = Math.min(st.combo, 6) / 6;
      glow.addColorStop(0, `rgba(34,211,238,${0.1 + heat * 0.2})`);
      glow.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // barra de tiempo
      const barW = (W - 32) * (timeLeft / DURATION);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(16, 16, W - 32, 8, 4);
      ctx.fill();
      ctx.fillStyle = timeLeft < 8 ? "#f87171" : "#22d3ee";
      ctx.beginPath();
      ctx.roundRect(16, 16, Math.max(0, barW), 8, 4);
      ctx.fill();

      // HUD
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 22px Georgia, serif";
      ctx.fillText(`${st.score}`, 16, 56);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 12px sans-serif";
      ctx.fillText("palabras", 16 + (st.score > 9 ? 30 : 18), 55);
      if (st.combo >= 2) {
        ctx.textAlign = "center";
        ctx.fillStyle = st.combo >= 3 ? "#fde047" : "#a5f3fc";
        ctx.font = "bold 16px Georgia, serif";
        ctx.fillText(`COMBO x${st.combo}`, W / 2, 55);
      }
      ctx.textAlign = "right";
      ctx.fillStyle = timeLeft < 8 ? "#fca5a5" : "rgba(255,255,255,0.55)";
      ctx.font = "600 13px sans-serif";
      ctx.fillText(`${Math.ceil(timeLeft)}s`, W - 16, 56);

      // teclas de la palabra
      const n = w.length;
      const cap = Math.min(46, Math.floor((W - 44) / n));
      const gap = Math.max(3, Math.min(7, Math.floor(cap * 0.14)));
      const totalW = n * cap + (n - 1) * gap;
      const startX = (W - totalW) / 2;
      const capY = 150 - cap / 2;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * (cap + gap);
        const done = i < typed.length && prefixOk;
        const current = i === typed.length && prefixOk;
        const bad = i < typed.length && !prefixOk;
        ctx.save();
        if (done) {
          ctx.shadowColor = "rgba(34,211,238,0.8)";
          ctx.shadowBlur = 16;
          const g = ctx.createLinearGradient(cx, capY, cx, capY + cap);
          g.addColorStop(0, "#67e8f9");
          g.addColorStop(1, "#0891b2");
          ctx.fillStyle = g;
        } else if (bad) {
          ctx.fillStyle = "#b91c1c";
        } else if (current) {
          ctx.shadowColor = "rgba(165,243,252,0.6)";
          ctx.shadowBlur = 12 + Math.sin(now / 120) * 6;
          ctx.fillStyle = "rgba(255,255,255,0.16)";
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
        }
        ctx.beginPath();
        ctx.roundRect(cx, capY, cap, cap, 8);
        ctx.fill();
        if (current) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#a5f3fc";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        // letra
        ctx.fillStyle = done ? "#06263a" : bad ? "#fecaca" : "rgba(255,255,255,0.92)";
        ctx.font = `bold ${Math.floor(cap * 0.56)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(w[i], cx + cap / 2, capY + cap / 2 + 1);
      }

      // pista inferior
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("Enter o espacio para confirmar", W / 2, 232);

      // partículas y pops
      stepParticles(ctx, st.parts);
      for (let i = st.pops.length - 1; i >= 0; i--) {
        const p = st.pops[i];
        p.y += p.vy;
        p.life -= 0.025;
        if (p.life <= 0) {
          st.pops.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.font = "bold 26px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitWord(candidate: string) {
    const st = s.current;
    if (st.done || !candidate) return;
    const w = st.queue[st.index % st.queue.length];
    if (candidate.toLowerCase() === w) {
      st.score += 1;
      st.combo += 1;
      setScore(st.score);
      onProgressRef.current?.(st.score);
      setCombo(st.combo);
      spawnBurst(st.parts, W / 2, 150, ["#67e8f9", "#a5f3fc", "#ffffff", "#818cf8"], 24, 4);
      st.pops.push({ x: W / 2, y: 120, text: st.combo >= 3 ? `¡x${st.combo}!` : "+1", life: 1, vy: -1.1, color: st.combo >= 3 ? "#fde047" : "#a5f3fc" });
      sfx.pad(Math.min(st.combo - 1, 3));
      vibrate(12);
      st.index += 1;
      if (st.index % st.queue.length === 0) {
        st.queue = shuffled();
        st.index = 0;
      }
    } else {
      st.combo = 0;
      setCombo(0);
      st.shake = 14;
      sfx.pulse();
      vibrate([25, 40, 25]);
    }
    st.typed = "";
    setValue("");
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Keyboard className="h-4 w-4 text-cyan-500" />
          <span className="font-display text-xl">{score}</span> palabras
        </span>
        <span className="text-ink-soft">
          {combo >= 2 ? <b className="text-cyan-500">combo x{combo}</b> : "teclea la palabra"}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[64vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#0a1230" }}
          onPointerDown={() => inputRef.current?.focus()}
        />
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          if (e.target.value.endsWith(" ")) {
            submitWord(e.target.value.trim());
            return;
          }
          setValue(e.target.value);
          s.current.typed = e.target.value.trim().toLowerCase();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitWord(value.trim());
        }}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        placeholder="Teclea aquí…"
        className="mt-2.5 w-full rounded-2xl border border-cyan-500/40 bg-ink/90 px-4 py-3 text-center font-display text-2xl tracking-wide text-cyan-50 placeholder:text-cyan-200/40 shadow-card focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
      />
    </div>
  );
}
