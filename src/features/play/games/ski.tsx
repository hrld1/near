"use client";

import { useEffect, useRef, useState } from "react";
import { Snowflake } from "lucide-react";
import { clamp, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Esquí / esquiva: bajada infinita en canvas. El esquiador va abajo y sigue el
// dedo en horizontal; árboles y rocas suben hacia él (el mundo baja). Cada
// puerta de eslalon cruzada da combo y bonus. Un choque y se acaba: puntúas la
// distancia. Va acelerando. Best-score (mismo sistema que Meteoros).

const W = 400;
const H = 560;
const SKIER_Y = H - 120;
const SKIER_R = 11;

type Obstacle = { x: number; y: number; type: "tree" | "rock"; r: number };
type Gate = { x: number; y: number; gap: number; done: boolean };
type Flake = { x: number; y: number; r: number; sp: number };

export function SkiGame({ onFinish }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const s = useRef({
    dist: 0,
    speed: 3.4,
    combo: 0,
    skierX: W / 2,
    targetX: W / 2,
    lean: 0, // -1..1 para inclinar al esquiador
    obstacles: [] as Obstacle[],
    gates: [] as Gate[],
    parts: [] as Particle[],
    flakes: [] as Flake[],
    spawnAcc: 0,
    gateAcc: 0,
    shake: 0,
    running: true,
    done: false
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;

    // nieve de fondo (parallax)
    for (let i = 0; i < 40; i++) {
      st.flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2, sp: 0.4 + Math.random() * 0.9 });
    }

    function finish() {
      if (st.done) return;
      st.done = true;
      st.running = false;
      st.shake = 20;
      spawnBurst(st.parts, st.skierX, SKIER_Y, ["#ffffff", "#e0f2fe", "#bae6fd", "#94a3b8"], 40, 5);
      setTimeout(() => onFinishRef.current(Math.floor(st.dist)), 1050);
    }

    function drawTree(x: number, y: number) {
      // sombra
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // tronco
      ctx.fillStyle = "#7c5230";
      ctx.fillRect(x - 3, y + 4, 6, 10);
      // copa
      ctx.fillStyle = "#1f7a43";
      for (let k = 0; k < 3; k++) {
        const yy = y - 14 + k * 9;
        const wd = 8 + k * 5;
        ctx.beginPath();
        ctx.moveTo(x, yy - 8);
        ctx.lineTo(x - wd, yy + 6);
        ctx.lineTo(x + wd, yy + 6);
        ctx.closePath();
        ctx.fill();
      }
      // nieve encima
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x - 5, y - 15);
      ctx.lineTo(x + 5, y - 15);
      ctx.closePath();
      ctx.fill();
    }

    function drawRock(x: number, y: number, r: number) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.7, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(x, y - r, x, y + r);
      g.addColorStop(0, "#9aa4b2");
      g.addColorStop(1, "#5b6472");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.35, r * 0.5, r * 0.28, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawSkier(x: number, y: number, lean: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean * 0.25);
      // esquís
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-9, 14);
      ctx.lineTo(-5, 2);
      ctx.moveTo(9, 14);
      ctx.lineTo(5, 2);
      ctx.stroke();
      // chaqueta (rosa: "tú")
      const g = ctx.createLinearGradient(0, -8, 0, 6);
      g.addColorStop(0, "#fb7185");
      g.addColorStop(1, "#e11d48");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-7, -6, 14, 14, 5);
      ctx.fill();
      // cabeza con gorro
      ctx.fillStyle = "#fcd9b6";
      ctx.beginPath();
      ctx.arc(0, -12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(0, -14, 5.2, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(0, -18, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (st.running) {
        st.speed = clamp(3.4 + st.dist / 900, 3.4, 9.5);
        st.dist += st.speed * 0.12;

        // seguir el dedo (suave) + inclinación
        const dx = st.targetX - st.skierX;
        st.skierX += dx * 0.18;
        st.skierX = clamp(st.skierX, 24, W - 24);
        st.lean = clamp(dx / 40, -1, 1);

        // spray de nieve tras el esquiador
        if (Math.abs(dx) > 6 && Math.random() < 0.7) {
          st.parts.push({
            x: st.skierX - Math.sign(dx) * 6,
            y: SKIER_Y + 10,
            vx: -Math.sign(dx) * (0.5 + Math.random()),
            vy: 0.6 + Math.random(),
            life: 1,
            decay: 0.05 + Math.random() * 0.04,
            size: 1.5 + Math.random() * 2,
            color: "#ffffff",
            gravity: 0.02
          });
        }

        // spawn obstáculos
        st.spawnAcc += st.speed;
        if (st.spawnAcc > 118) {
          st.spawnAcc = 0;
          const type = Math.random() < 0.62 ? "tree" : "rock";
          st.obstacles.push({ x: 26 + Math.random() * (W - 52), y: -30, type, r: type === "tree" ? 12 : 13 });
        }
        // spawn puertas de eslalon
        st.gateAcc += st.speed;
        if (st.gateAcc > 460) {
          st.gateAcc = 0;
          st.gates.push({ x: 70 + Math.random() * (W - 140), y: -20, gap: 78, done: false });
        }

        // mover y colisionar obstáculos
        for (let i = st.obstacles.length - 1; i >= 0; i--) {
          const o = st.obstacles[i];
          o.y += st.speed;
          if (o.y > H + 40) {
            st.obstacles.splice(i, 1);
            continue;
          }
          if (Math.hypot(o.x - st.skierX, o.y - SKIER_Y) < o.r + SKIER_R) {
            finish();
          }
        }

        // mover puertas y puntuar al cruzarlas
        for (let i = st.gates.length - 1; i >= 0; i--) {
          const gt = st.gates[i];
          const prevY = gt.y;
          gt.y += st.speed;
          if (!gt.done && prevY < SKIER_Y && gt.y >= SKIER_Y) {
            gt.done = true;
            const inside = Math.abs(st.skierX - gt.x) < gt.gap / 2;
            if (inside) {
              st.dist += 30 + st.combo * 6;
              setCombo((c) => c + 1);
              st.combo += 1;
              spawnBurst(st.parts, st.skierX, SKIER_Y - 6, ["#38bdf8", "#a5f3fc", "#fef08a", "#ffffff"], 14, 3);
            } else {
              st.combo = 0;
              setCombo(0);
            }
          }
          if (gt.y > H + 30) st.gates.splice(i, 1);
        }

        setScore(Math.floor(st.dist));
      }

      st.shake = Math.max(0, st.shake - 0.9);

      // ---- dibujo ----
      ctx.save();
      if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);

      // pista nevada
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#dbeafe");
      bg.addColorStop(1, "#f8fafc");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // nieve parallax
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const f of st.flakes) {
        if (st.running) {
          f.y += st.speed * f.sp * 0.5 + f.sp;
          if (f.y > H) {
            f.y = -4;
            f.x = Math.random() * W;
          }
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // líneas de velocidad a alta velocidad
      if (st.speed > 6) {
        ctx.strokeStyle = "rgba(148,163,184,0.25)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const lx = (i * 97 + (Date.now() / 6) % 120) % W;
          ctx.beginPath();
          ctx.moveTo(lx, 0);
          ctx.lineTo(lx, 40);
          ctx.stroke();
        }
      }

      // puertas de eslalon (banderas)
      for (const gt of st.gates) {
        for (const side of [-1, 1] as const) {
          const px = gt.x + (side * gt.gap) / 2;
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, gt.y - 16);
          ctx.lineTo(px, gt.y + 6);
          ctx.stroke();
          ctx.fillStyle = side < 0 ? "#2563eb" : "#dc2626";
          ctx.beginPath();
          ctx.moveTo(px, gt.y - 16);
          ctx.lineTo(px + side * 12, gt.y - 12);
          ctx.lineTo(px, gt.y - 8);
          ctx.closePath();
          ctx.fill();
        }
      }

      // obstáculos
      for (const o of st.obstacles) {
        if (o.type === "tree") drawTree(o.x, o.y);
        else drawRock(o.x, o.y, o.r);
      }

      stepParticles(ctx, st.parts);

      if (st.running || st.shake > 0.3) drawSkier(st.skierX, SKIER_Y, st.lean);

      // HUD
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.font = "bold 26px Georgia, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`${Math.floor(st.dist)}`, 16, 36);
      ctx.fillStyle = "rgba(15,23,42,0.5)";
      ctx.font = "600 12px sans-serif";
      ctx.fillText("m", 16 + ctx.measureText(`${Math.floor(st.dist)}`).width + 24, 35);
      if (st.combo >= 2) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#0ea5e9";
        ctx.font = "bold 18px Georgia, serif";
        ctx.fillText(`COMBO x${st.combo}`, W - 16, 34);
      }

      if (!st.running) {
        ctx.fillStyle = "rgba(15,23,42,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 34px Georgia, serif";
        ctx.fillText("¡Batacazo!", W / 2, H / 2 - 6);
        ctx.font = "600 18px sans-serif";
        ctx.fillText(`${Math.floor(st.dist)} m`, W / 2, H / 2 + 26);
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      st.targetX = clamp(pointerPos(canvas, e, W, H).x, 24, W - 24);
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
          <Snowflake className="h-4 w-4 text-sky-500" />
          <span className="font-display text-xl">{score}</span> m
        </span>
        <span className="text-ink-soft">
          {combo >= 2 ? <b className="text-sky-500">combo x{combo}</b> : "mueve el dedo para esquivar"}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[65vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#eef2ff" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Baja esquivando árboles y rocas. Cruza las puertas para encadenar combo.
      </p>
    </div>
  );
}
