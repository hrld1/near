"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { sfx } from "@/lib/sound";
import { setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Eco (Simon), versión canvas neón: cuatro pads que se encienden con brillo y
// tono; repites la secuencia, que crece cada ronda. Estallido de partículas al
// acertar, sacudida roja al fallar. Puntúa las rondas completadas (igual que antes).

const W = 360;
const H = 360;
const PAD_COLORS = [
  { dim: "#7f1d3a", lit: "#f43f5e", glow: "#fb7185" }, // rosa
  { dim: "#3b2a63", lit: "#8b5cf6", glow: "#a78bfa" }, // plum
  { dim: "#7a5312", lit: "#f59e0b", glow: "#fbbf24" }, // ámbar
  { dim: "#0c4a63", lit: "#0ea5e9", glow: "#38bdf8" } // cielo
];
const P = 18;
const G = 14;
const CELL = (W - 2 * P - G) / 2;

function padRect(i: number) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return { x: P + col * (CELL + G), y: P + row * (CELL + G), w: CELL, h: CELL, cx: 0, cy: 0 };
}

export function EchoGame({ onFinish }: { onFinish: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState<"showing" | "input" | "failed">("showing");

  const s = useRef({
    seq: [] as number[],
    inputIndex: 0,
    lit: null as number | null,
    phase: "showing" as "showing" | "input" | "failed",
    rounds: 0,
    parts: [] as Particle[],
    shake: 0,
    done: false
  });
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function playback() {
      st.phase = "showing";
      setStatus("showing");
      st.inputIndex = 0;
      await sleep(600);
      for (const pad of st.seq) {
        st.lit = pad;
        sfx.pad(pad);
        await sleep(Math.max(230, 470 - st.seq.length * 18));
        st.lit = null;
        await sleep(150);
      }
      st.phase = "input";
      setStatus("input");
    }

    function addStep() {
      st.seq.push(Math.floor(Math.random() * 4));
      setRound(st.seq.length);
      void playback();
    }

    function burst(i: number) {
      const r = padRect(i);
      spawnBurst(st.parts, r.x + r.w / 2, r.y + r.h / 2, [PAD_COLORS[i].glow, "#ffffff"], 16, 3.4);
    }

    async function press(pad: number) {
      if (st.phase !== "input") return;
      st.lit = pad;
      sfx.pad(pad);
      burst(pad);
      setTimeout(() => {
        if (st.lit === pad) st.lit = null;
      }, 180);
      if (pad !== st.seq[st.inputIndex]) {
        st.phase = "failed";
        st.shake = 16;
        setStatus("failed");
        if (!st.done) {
          st.done = true;
          setTimeout(() => onFinishRef.current(st.rounds), 1100);
        }
        return;
      }
      st.inputIndex += 1;
      if (st.inputIndex >= st.seq.length) {
        st.rounds = st.seq.length;
        st.phase = "showing";
        setStatus("showing");
        await sleep(520);
        addStep();
      }
    }

    function roundedRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
      bg.addColorStop(0, "#161033");
      bg.addColorStop(1, "#0a0620");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      if (st.shake > 0) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
        st.shake *= 0.85;
        if (st.shake < 0.4) st.shake = 0;
      }
      for (let i = 0; i < 4; i++) {
        const r = padRect(i);
        const on = st.lit === i;
        const c = PAD_COLORS[i];
        ctx.save();
        if (on) {
          ctx.shadowColor = c.glow;
          ctx.shadowBlur = 34;
        }
        const grow = on ? 3 : 0;
        const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
        g.addColorStop(0, on ? c.lit : c.dim);
        g.addColorStop(1, on ? c.glow : c.dim);
        ctx.fillStyle = g;
        ctx.globalAlpha = on ? 1 : 0.55;
        roundedRect(r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, 22);
        ctx.fill();
        ctx.restore();
        // brillo superior
        ctx.globalAlpha = on ? 0.35 : 0.12;
        ctx.fillStyle = "#ffffff";
        roundedRect(r.x + 10, r.y + 8, r.w - 20, 12, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      stepParticles(ctx, st.parts);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    addStep();

    function onPointer(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const y = ((e.clientY - rect.top) / rect.height) * H;
      for (let i = 0; i < 4; i++) {
        const r = padRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          void press(i);
          break;
        }
      }
    }
    canvas.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <AudioLines className="h-4 w-4 text-sky-500" /> Eco
        </span>
        <span
          className={
            status === "failed"
              ? "font-medium text-red-600"
              : status === "showing"
                ? "text-ink-soft"
                : "font-medium text-emerald-600"
          }
        >
          {status === "failed" ? "¡Fallo!" : status === "showing" ? "Memoriza…" : "Tu turno"} · Ronda{" "}
          <b className="text-ink">{round}</b>
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block w-full max-w-[360px] touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#0a0620" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Observa la secuencia y repítela. Cada ronda añade un paso.
      </p>
    </div>
  );
}
