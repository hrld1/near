"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { sfx, vibrate } from "@/lib/sound";
import { setupHiDpi, pointerPos, spawnBurst, stepParticles, clamp, type Particle } from "./engine";

// Sprint, versión arcade en canvas: la operación flota con brillo y las cuatro
// respuestas son orbes que se pulsan al tocar. Acertar encadena COMBO (solo
// vistoso: más partículas y color), fallar sacude la pantalla. El scoring es
// idéntico al original — +1 acierto, −1 fallo (mínimo 0), 30 s — para que las
// puntuaciones sigan siendo comparables con el histórico y los duelos.

const W = 400;
const H = 440;
const DURATION = 30;

type Question = { text: string; answer: number; options: number[] };
type Pop = { x: number; y: number; text: string; life: number; vy: number; color: string; size: number };
type Rect = { x: number; y: number; w: number; h: number };

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

// Geometría fija de los 4 orbes (2×2) en la parte baja del lienzo.
const PAD = 16;
const BW = (W - PAD * 3) / 2;
const BH = 82;
const GAP = 14;
const BTOP = H - PAD - BH * 2 - GAP;
const BUTTONS: Rect[] = [
  { x: PAD, y: BTOP, w: BW, h: BH },
  { x: PAD * 2 + BW, y: BTOP, w: BW, h: BH },
  { x: PAD, y: BTOP + BH + GAP, w: BW, h: BH },
  { x: PAD * 2 + BW, y: BTOP + BH + GAP, w: BW, h: BH }
];

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function SprintGame({ onFinish, onProgress }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const s = useRef({
    q: makeQuestion(),
    score: 0,
    combo: 0,
    parts: [] as Particle[],
    pops: [] as Pop[],
    shake: 0,
    startedAt: 0,
    // feedback tras responder: orbe elegido + correcto, hasta un instante
    fx: null as { picked: number; correct: number; ok: boolean; until: number } | null,
    press: [-0, -0, -0, -0] as number[], // 0..1 pulso por orbe
    done: false
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    st.startedAt = performance.now();
    let raf = 0;
    let advTimer: ReturnType<typeof setTimeout> | null = null;

    function pop(x: number, y: number, text: string, color: string, size = 30) {
      st.pops.push({ x, y, text, life: 1, vy: -1.1, color, size });
    }

    function nextQuestion() {
      st.q = makeQuestion();
      st.fx = null;
    }

    function answer(idx: number) {
      if (st.done || st.fx) return;
      const opt = st.q.options[idx];
      const correctIdx = st.q.options.indexOf(st.q.answer);
      const ok = opt === st.q.answer;
      st.press[idx] = 1;
      const cx = BUTTONS[idx].x + BUTTONS[idx].w / 2;
      const cy = BUTTONS[idx].y + BUTTONS[idx].h / 2;
      if (ok) {
        st.score += 1;
        st.combo += 1;
        setScore(st.score);
        onProgressRef.current?.(st.score);
        setCombo(st.combo);
        spawnBurst(st.parts, cx, cy, ["#f0abfc", "#e879f9", "#ffffff", "#c084fc"], 22, 4);
        pop(cx, cy - 8, st.combo >= 3 ? `¡x${st.combo}!` : "+1", st.combo >= 3 ? "#fde047" : "#f5d0fe", st.combo >= 3 ? 34 : 28);
        sfx.pad(Math.min(st.combo - 1, 3));
        vibrate(12);
        st.fx = { picked: idx, correct: correctIdx, ok: true, until: performance.now() + 150 };
        advTimer = setTimeout(nextQuestion, 150);
      } else {
        st.score = clamp(st.score - 1, 0, 999);
        st.combo = 0;
        setScore(st.score);
        onProgressRef.current?.(st.score);
        setCombo(0);
        st.shake = 14;
        spawnBurst(st.parts, cx, cy, ["#f87171", "#fca5a5"], 14, 3);
        pop(cx, cy - 8, "−1", "#fca5a5", 26);
        sfx.pulse();
        vibrate([25, 40, 25]);
        st.fx = { picked: idx, correct: correctIdx, ok: false, until: performance.now() + 260 };
        advTimer = setTimeout(nextQuestion, 260);
      }
    }

    function drawOrb(ctx: CanvasRenderingContext2D, r: Rect, label: string, idx: number, now: number) {
      const fx = st.fx;
      let a = "#fdf4ff";
      let b = "#c026d3";
      let glow = "rgba(217,70,239,0.5)";
      if (fx && fx.until > now) {
        if (idx === fx.correct) {
          a = "#bbf7d0"; b = "#16a34a"; glow = "rgba(34,197,94,0.7)";
        } else if (idx === fx.picked && !fx.ok) {
          a = "#fecaca"; b = "#dc2626"; glow = "rgba(248,113,113,0.7)";
        }
      }
      const press = st.press[idx];
      const scale = 1 - press * 0.06;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const w = r.w * scale;
      const h = r.h * scale;
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 18 + press * 14;
      const g = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 18);
      ctx.fill();
      // brillo superior
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 + 6, cy - h / 2 + 5, w - 12, h * 0.34, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      // número
      ctx.fillStyle = "rgba(30,10,40,0.92)";
      ctx.font = "bold 30px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 1);
      ctx.restore();
    }

    function frame(now: number) {
      const elapsed = (now - st.startedAt) / 1000;
      const timeLeft = Math.max(0, DURATION - elapsed);
      if (timeLeft <= 0 && !st.done) {
        st.done = true;
        setTimeout(() => onFinishRef.current(st.score), 700);
      }
      st.shake = Math.max(0, st.shake - 0.9);
      for (let i = 0; i < 4; i++) st.press[i] = Math.max(0, st.press[i] - 0.12);

      ctx.save();
      if (st.shake > 0.3) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }

      // fondo neón
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#2a0a3a");
      bg.addColorStop(1, "#160a2e");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      // resplandor central según combo
      const glow = ctx.createRadialGradient(W / 2, 150, 20, W / 2, 150, 240);
      const heat = Math.min(st.combo, 6) / 6;
      glow.addColorStop(0, `rgba(232,121,249,${0.14 + heat * 0.22})`);
      glow.addColorStop(1, "rgba(232,121,249,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // barra de tiempo
      const tw = (W - PAD * 2) * (timeLeft / DURATION);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(PAD, 16, W - PAD * 2, 8, 4);
      ctx.fill();
      ctx.fillStyle = timeLeft < 6 ? "#f87171" : "#e879f9";
      ctx.beginPath();
      ctx.roundRect(PAD, 16, Math.max(0, tw), 8, 4);
      ctx.fill();

      // HUD
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 22px Georgia, serif";
      ctx.fillText(`${st.score}`, PAD, 56);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 12px sans-serif";
      ctx.fillText("puntos", PAD + (st.score > 9 ? 34 : 22), 55);
      if (st.combo >= 2) {
        ctx.textAlign = "right";
        ctx.fillStyle = st.combo >= 3 ? "#fde047" : "#f5d0fe";
        ctx.font = "bold 18px Georgia, serif";
        ctx.fillText(`COMBO x${st.combo}`, W - PAD, 55);
      }
      ctx.textAlign = "right";
      ctx.fillStyle = timeLeft < 6 ? "#fca5a5" : "rgba(255,255,255,0.55)";
      ctx.font = "600 13px sans-serif";
      ctx.fillText(`${Math.ceil(timeLeft)}s`, W - PAD, 78);

      // operación
      const eqPulse = st.combo >= 3 ? 1 + Math.sin(now / 140) * 0.03 : 1;
      ctx.save();
      ctx.translate(W / 2, 150);
      ctx.scale(eqPulse, eqPulse);
      ctx.shadowColor = "rgba(240,171,252,0.7)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.q.text, 0, 0);
      ctx.restore();

      // orbes
      st.q.options.forEach((opt, i) => drawOrb(ctx, BUTTONS[i], `${opt}`, i, now));

      // partículas y textos flotantes
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
        ctx.font = `bold ${p.size}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      const { x, y } = pointerPos(canvas, e, W, H);
      const idx = BUTTONS.findIndex((r) => inRect(r, x, y));
      if (idx >= 0) answer(idx);
    };
    canvas.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(raf);
      if (advTimer) clearTimeout(advTimer);
      canvas.removeEventListener("pointerdown", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Calculator className="h-4 w-4 text-fuchsia-500" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span className="text-ink-soft">
          {combo >= 2 ? <b className="text-fuchsia-500">combo x{combo}</b> : "toca la respuesta"}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[64vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#160a2e" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Resuelve a toda velocidad. Encadena aciertos para el combo.
      </p>
    </div>
  );
}
