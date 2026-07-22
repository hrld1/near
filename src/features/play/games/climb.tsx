"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud } from "lucide-react";
import { clamp, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";
import { steerAxis, useSteerKeys } from "./keyboard";

// A las nubes: saltador infinito (estilo doodle jump). El personaje rebota solo
// en las plataformas; mueves el dedo para dirigirlo. La cámara sube contigo y
// puntúas la altura. Hay plataformas móviles, frágiles (se rompen) y muelles
// (te lanzan más alto). Si caes por abajo, se acaba. Best-score.

const W = 400;
const H = 560;
const MARGIN = 14;
const R = 15; // radio del personaje
const GRAV = 0.34;
const JUMP = 11.2;
const SPRING = 18.5;
const PH = 12; // grosor de plataforma
const CAM_LINE = H * 0.42;

type PType = "normal" | "moving" | "fragile" | "spring";
type Plat = { x: number; baseX: number; y: number; w: number; type: PType; phase: number; dead: boolean };

function pickType(heightM: number): PType {
  const r = Math.random();
  const hard = clamp(heightM / 1200, 0, 0.5); // más difícil según subes
  if (r < 0.08) return "spring";
  if (r < 0.26 + hard * 0.2) return "moving";
  if (r < 0.4 + hard * 0.3) return "fragile";
  return "normal";
}

export function ClimbGame({ onFinish, onProgress }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heldKeys = useSteerKeys();
  const [score, setScore] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const s = useRef({
    char: { x: W / 2, y: H - 120, vy: -JUMP, squash: 1 },
    targetX: W / 2,
    platforms: [] as Plat[],
    clouds: [] as { x: number; y: number; r: number; sp: number }[],
    parts: [] as Particle[],
    height: 0,
    maxHeight: 0,
    running: true,
    done: false,
    shake: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;

    // plataforma inicial bajo el personaje + relleno
    st.platforms.push({ x: W / 2 - 32, baseX: W / 2 - 32, y: H - 88, w: 64, type: "normal", phase: 0, dead: false });
    for (let i = 0; i < 8; i++) {
      const w = 58 + Math.random() * 14;
      st.platforms.push({
        x: MARGIN + Math.random() * (W - 2 * MARGIN - w),
        baseX: 0,
        y: H - 160 - i * 62,
        w,
        type: i < 2 ? "normal" : pickType(0),
        phase: Math.random() * Math.PI * 2,
        dead: false
      });
    }
    st.platforms.forEach((p) => (p.baseX = p.x));
    for (let i = 0; i < 6; i++) st.clouds.push({ x: Math.random() * W, y: Math.random() * H, r: 20 + Math.random() * 26, sp: 0.1 + Math.random() * 0.25 });

    function ensurePlatforms() {
      let topY = Math.min(...st.platforms.map((p) => p.y));
      while (topY > -60) {
        const gap = 56 + Math.random() * 48;
        const y = topY - gap;
        const w = 56 + Math.random() * 16;
        const x = MARGIN + Math.random() * (W - 2 * MARGIN - w);
        st.platforms.push({ x, baseX: x, y, w, type: pickType(st.maxHeight / 10), phase: Math.random() * Math.PI * 2, dead: false });
        topY = y;
      }
    }

    function finish() {
      if (st.done) return;
      st.done = true;
      st.running = false;
      st.shake = 12;
      setTimeout(() => onFinishRef.current(Math.floor(st.maxHeight / 10)), 950);
    }

    function drawChar(x: number, y: number, squash: number) {
      const sx = 2 - squash;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, squash);
      // cuerpo
      const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, R);
      g.addColorStop(0, "#fda4af");
      g.addColorStop(1, "#e11d48");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      // orejas
      ctx.fillStyle = "#fb7185";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sgn * 8, -R + 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // ojos
      ctx.fillStyle = "#ffffff";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sgn * 5, -2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#1e293b";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sgn * 5 + sgn * 1, -2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // sonrisa
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    function drawPlatform(p: Plat) {
      if (p.type === "spring") {
        // muelle sobre la plataforma
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2 - 5, p.y);
        ctx.lineTo(p.x + p.w / 2, p.y - 8);
        ctx.lineTo(p.x + p.w / 2 + 5, p.y);
        ctx.stroke();
      }
      const colors: Record<PType, [string, string]> = {
        normal: ["#4ade80", "#16a34a"],
        moving: ["#38bdf8", "#0284c7"],
        fragile: ["#d6b48c", "#a1795a"],
        spring: ["#34d399", "#059669"]
      };
      const [c0, c1] = colors[p.type];
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.roundRect(p.x, p.y + 2, p.w, PH, 6);
      ctx.fill();
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + PH);
      g.addColorStop(0, p.dead ? "#94836b" : c0);
      g.addColorStop(1, p.dead ? "#6b5a45" : c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, PH, 6);
      ctx.fill();
      if (p.type === "fragile") {
        ctx.strokeStyle = "rgba(80,50,20,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w * 0.4, p.y);
        ctx.lineTo(p.x + p.w * 0.5, p.y + PH);
        ctx.moveTo(p.x + p.w * 0.65, p.y);
        ctx.lineTo(p.x + p.w * 0.55, p.y + PH);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(p.x + 3, p.y + 2, p.w - 6, 2);
    }

    function frame() {
      const t = performance.now() / 1000;
      const c = st.char;

      if (st.running) {
        const axis = steerAxis(heldKeys.current);
        if (axis.x) st.targetX = clamp(st.targetX + axis.x * 7, R, W - R);

        c.vy += GRAV;
        c.y += c.vy;
        c.x += (st.targetX - c.x) * 0.2;
        c.x = clamp(c.x, R, W - R);
        c.squash += (1 - c.squash) * 0.18;

        // plataformas móviles oscilan
        for (const p of st.platforms) {
          if (p.type === "moving" && !p.dead) {
            p.x = clamp(p.baseX + Math.sin(t * 1.5 + p.phase) * 46, MARGIN, W - MARGIN - p.w);
          }
          if (p.dead) p.y += 6; // frágil rota cayendo
        }

        // cámara: al subir por encima de la línea, baja el mundo
        if (c.y < CAM_LINE) {
          const d = CAM_LINE - c.y;
          c.y = CAM_LINE;
          for (const p of st.platforms) p.y += d;
          for (const cl of st.clouds) cl.y += d * cl.sp;
          st.height += d;
          st.maxHeight = Math.max(st.maxHeight, st.height);
          setScore(Math.floor(st.maxHeight / 10));
          onProgressRef.current?.(Math.floor(st.maxHeight / 10));
        }

        // rebotes (solo al caer)
        if (c.vy > 0) {
          for (const p of st.platforms) {
            if (p.dead) continue;
            if (
              c.x > p.x - R * 0.5 &&
              c.x < p.x + p.w + R * 0.5 &&
              c.y + R >= p.y &&
              c.y + R <= p.y + PH + Math.max(c.vy, 6)
            ) {
              c.y = p.y - R;
              c.squash = 0.62;
              spawnBurst(st.parts, c.x, p.y, ["#ffffff", "#fecdd3"], 8, 2);
              if (p.type === "spring") c.vy = -SPRING;
              else c.vy = -JUMP;
              if (p.type === "fragile") p.dead = true;
              break;
            }
          }
        }

        ensurePlatforms();
        st.platforms = st.platforms.filter((p) => p.y < H + 60);

        if (c.y - R > H) finish();
      }

      st.shake = Math.max(0, st.shake - 0.9);

      // ---- dibujo ----
      ctx.save();
      if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#bae6fd");
      bg.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // nubes
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const cl of st.clouds) {
        if (cl.y > H + 30) {
          cl.y = -20;
          cl.x = Math.random() * W;
        }
        ctx.beginPath();
        ctx.ellipse(cl.x, cl.y, cl.r, cl.r * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(cl.x + cl.r * 0.7, cl.y + 4, cl.r * 0.7, cl.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of st.platforms) drawPlatform(p);
      stepParticles(ctx, st.parts);
      if (st.running || st.shake > 0.3) drawChar(c.x, c.y, c.squash);

      // HUD
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.font = "bold 26px Georgia, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`${Math.floor(st.maxHeight / 10)}`, 16, 36);
      ctx.fillStyle = "rgba(15,23,42,0.5)";
      ctx.font = "600 12px sans-serif";
      ctx.fillText("m", 16 + ctx.measureText(`${Math.floor(st.maxHeight / 10)}`).width + 24, 35);

      if (!st.running) {
        ctx.fillStyle = "rgba(15,23,42,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 34px Georgia, serif";
        ctx.fillText("¡Al suelo!", W / 2, H / 2 - 6);
        ctx.font = "600 18px sans-serif";
        ctx.fillText(`${Math.floor(st.maxHeight / 10)} m`, W / 2, H / 2 + 26);
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      st.targetX = clamp(pointerPos(canvas, e, W, H).x, R, W - R);
    };
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", onPointer);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Cloud className="h-4 w-4 text-sky-500" />
          <span className="font-display text-xl">{score}</span> m
        </span>
        <span className="text-ink-soft">dedo o flechas para dirigir el salto</span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[64vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#e0f2fe" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Rebota de plataforma en plataforma y sube. Cuidado con las frágiles; los muelles te lanzan.
      </p>
    </div>
  );
}
