"use client";

import { useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { clamp, drawAim, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Minigolf en canvas: 5 hoyos con obstaculos, apuntado tirachinas y fisica
// de rebotes. Score = golpes totales (menos es mejor), max 8 por hoyo.

const W = 400;
const H = 340;
const BALL_R = 8;
const HOLE_R = 12;
const MAX_STROKES = 8;

type Wall = { x: number; y: number; w: number; h: number };
type Hole = { ball: { x: number; y: number }; hole: { x: number; y: number }; walls: Wall[]; par: number };

const HOLES: Hole[] = [
  { ball: { x: 70, y: 170 }, hole: { x: 330, y: 170 }, walls: [], par: 2 },
  {
    ball: { x: 70, y: 170 },
    hole: { x: 330, y: 100 },
    walls: [{ x: 190, y: 20, w: 20, h: 190 }],
    par: 3
  },
  {
    ball: { x: 60, y: 280 },
    hole: { x: 340, y: 60 },
    walls: [
      { x: 130, y: 120, w: 200, h: 18 },
      { x: 70, y: 200, w: 200, h: 18 }
    ],
    par: 3
  },
  {
    ball: { x: 70, y: 60 },
    hole: { x: 330, y: 280 },
    walls: [
      { x: 150, y: 20, w: 18, h: 140 },
      { x: 240, y: 180, w: 18, h: 140 }
    ],
    par: 3
  },
  {
    ball: { x: 200, y: 300 },
    hole: { x: 200, y: 55 },
    walls: [
      { x: 20, y: 130, w: 130, h: 18 },
      { x: 250, y: 130, w: 130, h: 18 },
      { x: 105, y: 210, w: 190, h: 18 }
    ],
    par: 4
  }
];

export function GolfGame({ onFinish }: { onFinish: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [holeIndex, setHoleIndex] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const stateRef = useRef({
    holeIndex: 0,
    strokes: 0,
    total: 0,
    ball: { x: HOLES[0].ball.x, y: HOLES[0].ball.y, vx: 0, vy: 0 },
    sinking: 0, // >0 = animacion de embocar (frames restantes)
    transitioning: false,
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragNow: { x: 0, y: 0 },
    done: false
  });
  const particlesRef = useRef<Particle[]>([]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const s = stateRef.current;
    let raf = 0;

    const ballMoving = () => Math.hypot(s.ball.vx, s.ball.vy) > 0.06;

    function currentHole() {
      return HOLES[s.holeIndex];
    }

    function nextHole(sunk: boolean) {
      s.transitioning = true;
      const label = sunk
        ? s.strokes === 1
          ? "Hoyo en uno!!"
          : `Hoyo en ${s.strokes}`
        : "Al siguiente...";
      setBanner(label);
      setTimeout(() => {
        setBanner(null);
        if (s.holeIndex + 1 >= HOLES.length) {
          if (!s.done) {
            s.done = true;
            onFinishRef.current(s.total);
          }
          return;
        }
        s.holeIndex += 1;
        s.strokes = 0;
        const h = currentHole();
        s.ball = { x: h.ball.x, y: h.ball.y, vx: 0, vy: 0 };
        s.sinking = 0;
        s.transitioning = false;
        setHoleIndex(s.holeIndex);
        setStrokes(0);
      }, 900);
    }

    function physics() {
      if (s.sinking > 0) {
        s.sinking -= 1;
        if (s.sinking === 0) nextHole(true);
        return;
      }
      if (!ballMoving()) {
        s.ball.vx = 0;
        s.ball.vy = 0;
        return;
      }
      const steps = 2; // sub-pasos para no atravesar paredes a alta velocidad
      for (let i = 0; i < steps; i++) {
        s.ball.x += s.ball.vx / steps;
        s.ball.y += s.ball.vy / steps;

        // bordes del campo
        if (s.ball.x < 20 + BALL_R) { s.ball.x = 20 + BALL_R; s.ball.vx *= -0.82; }
        if (s.ball.x > W - 20 - BALL_R) { s.ball.x = W - 20 - BALL_R; s.ball.vx *= -0.82; }
        if (s.ball.y < 20 + BALL_R) { s.ball.y = 20 + BALL_R; s.ball.vy *= -0.82; }
        if (s.ball.y > H - 20 - BALL_R) { s.ball.y = H - 20 - BALL_R; s.ball.vy *= -0.82; }

        // paredes interiores
        for (const wall of currentHole().walls) {
          const cx = clamp(s.ball.x, wall.x, wall.x + wall.w);
          const cy = clamp(s.ball.y, wall.y, wall.y + wall.h);
          const dx = s.ball.x - cx;
          const dy = s.ball.y - cy;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < BALL_R * BALL_R) {
            const dist = Math.sqrt(dist2) || 0.001;
            const nx = dx / dist;
            const ny = dy / dist;
            // empuja fuera y refleja
            s.ball.x = cx + nx * BALL_R;
            s.ball.y = cy + ny * BALL_R;
            const dot = s.ball.vx * nx + s.ball.vy * ny;
            s.ball.vx = (s.ball.vx - 2 * dot * nx) * 0.82;
            s.ball.vy = (s.ball.vy - 2 * dot * ny) * 0.82;
          }
        }
      }
      // friccion
      s.ball.vx *= 0.984;
      s.ball.vy *= 0.984;

      // captura del hoyo (cerca y sin ir demasiado rápido)
      const h = currentHole().hole;
      const d = Math.hypot(s.ball.x - h.x, s.ball.y - h.y);
      const speed = Math.hypot(s.ball.vx, s.ball.vy);
      if (d < HOLE_R && speed < 3.2) {
        s.ball.vx = 0;
        s.ball.vy = 0;
        s.ball.x = h.x;
        s.ball.y = h.y;
        s.sinking = 22;
        spawnBurst(particlesRef.current, h.x, h.y, ["#4ade80", "#a3e635", "#fef08a", "#ffffff"], 26, 3.6);
      }
    }

    function draw() {
      const hole = currentHole();

      // cesped con franjas segadas
      const grass = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 280);
      grass.addColorStop(0, "#59b558");
      grass.addColorStop(1, "#3a8f42");
      ctx.fillStyle = grass;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) ctx.fillRect(0, i * (H / 8), W, H / 8);
      }

      // borde de madera
      ctx.strokeStyle = "#7c5230";
      ctx.lineWidth = 12;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 9, W - 18, H - 18);

      // paredes interiores
      for (const wall of hole.walls) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(wall.x + 3, wall.y + 4, wall.w, wall.h);
        const wood = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
        wood.addColorStop(0, "#a0693c");
        wood.addColorStop(1, "#7c5230");
        ctx.fillStyle = wood;
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(wall.x, wall.y, wall.w, 3);
      }

      // hoyo + banderin
      const hx = hole.hole.x;
      const hy = hole.hole.y;
      const holeGrad = ctx.createRadialGradient(hx, hy, 2, hx, hy, HOLE_R);
      holeGrad.addColorStop(0, "#000000");
      holeGrad.addColorStop(1, "#1f2d20");
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.ellipse(hx, hy, HOLE_R, HOLE_R * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // mastil y bandera (no en el hoyo activo si la bola esta cerca)
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 2);
      ctx.lineTo(hx, hy - 44);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(hx, hy - 44);
      ctx.lineTo(hx + 22, hy - 37);
      ctx.lineTo(hx, hy - 30);
      ctx.closePath();
      ctx.fill();

      // apuntado
      if (s.dragging && !ballMoving() && s.sinking === 0) {
        const dx = s.dragStart.x - s.dragNow.x;
        const dy = s.dragStart.y - s.dragNow.y;
        const power = clamp(Math.hypot(dx, dy) / 130, 0, 1);
        if (power > 0.05) {
          drawAim(ctx, s.ball.x, s.ball.y, dx, dy, power);
        }
      }

      // bola (con sombra y encogida si esta embocando)
      const shrink = s.sinking > 0 ? s.sinking / 22 : 1;
      if (shrink > 0.05) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(s.ball.x + 2, s.ball.y + 4, BALL_R * shrink, BALL_R * 0.5 * shrink, 0, 0, Math.PI * 2);
        ctx.fill();
        const ballGrad = ctx.createRadialGradient(
          s.ball.x - 3, s.ball.y - 3, 1,
          s.ball.x, s.ball.y, BALL_R
        );
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(1, "#c9ced6");
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(s.ball.x, s.ball.y, BALL_R * shrink, 0, Math.PI * 2);
        ctx.fill();
      }

      stepParticles(ctx, particlesRef.current);
    }

    function frame() {
      physics();
      draw();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onDown(e: PointerEvent) {
      if (ballMoving() || s.sinking > 0 || s.transitioning || s.done) return;
      canvas.setPointerCapture(e.pointerId);
      const p = pointerPos(canvas, e, W, H);
      s.dragging = true;
      s.dragStart = p;
      s.dragNow = p;
    }
    function onMove(e: PointerEvent) {
      if (!s.dragging) return;
      s.dragNow = pointerPos(canvas, e, W, H);
    }
    function onUp() {
      if (!s.dragging) return;
      s.dragging = false;
      const dx = s.dragStart.x - s.dragNow.x;
      const dy = s.dragStart.y - s.dragNow.y;
      const power = clamp(Math.hypot(dx, dy) / 130, 0, 1);
      if (power < 0.08) return; // toque accidental
      const angle = Math.atan2(dy, dx);
      const speed = power * 10.5;
      s.ball.vx = Math.cos(angle) * speed;
      s.ball.vy = Math.sin(angle) * speed;
      s.strokes += 1;
      s.total += 1;
      setStrokes(s.strokes);
      setTotalStrokes(s.total);
      if (s.strokes >= MAX_STROKES) {
        // limite de golpes: pasamos de hoyo cuando pare la bola
        const waitStop = setInterval(() => {
          if (!ballMoving() && s.sinking === 0 && !s.transitioning) {
            clearInterval(waitStop);
            nextHole(false);
          }
        }, 200);
      }
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const par = HOLES[holeIndex].par;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Flag className="h-4 w-4 text-green-600" />
          Hoyo <span className="font-display text-xl">{holeIndex + 1}</span>/{HOLES.length}
          <span className="ml-1 text-xs text-ink-soft">(par {par})</span>
        </span>
        <span className="text-ink-soft">
          {strokes} {strokes === 1 ? "golpe" : "golpes"} · total{" "}
          <b className="text-ink">{totalStrokes}</b>
        </span>
      </div>
      <div className="relative select-none overflow-hidden rounded-xl shadow-card">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
        {banner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pop-in rounded-2xl bg-black/60 px-6 py-3 font-display text-2xl text-white backdrop-blur-sm">
              {banner}
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Arrastra desde cualquier punto y suelta: la bola sale en la direccion de la flecha.
      </p>
    </div>
  );
}
