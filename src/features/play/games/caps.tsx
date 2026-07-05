"use client";

import { useEffect, useRef, useState } from "react";
import { Disc } from "lucide-react";
import { clamp, drawAim, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Chapas en canvas: desliza 5 chapas hacia la diana. Puntuan por el anillo
// donde queden paradas y pueden empujarse unas a otras (colision elastica).

const W = 400;
const H = 340;
const CAP_R = 13;
const TARGET = { x: 200, y: 105 };
const RINGS = [
  { r: 20, points: 25, color: "#f43f5e" },
  { r: 44, points: 15, color: "#fb923c" },
  { r: 72, points: 10, color: "#fbbf24" },
  { r: 102, points: 5, color: "#a3e635" }
];
const TOTAL_CAPS = 5;
const LAUNCH = { x: 200, y: 300 };

type Cap = { x: number; y: number; vx: number; vy: number; hue: number };

function ringPoints(cap: Cap): number {
  const d = Math.hypot(cap.x - TARGET.x, cap.y - TARGET.y);
  for (const ring of RINGS) if (d <= ring.r) return ring.points;
  return 0;
}

export function CapsGame({ onFinish }: { onFinish: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thrown, setThrown] = useState(0);
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    caps: [] as Cap[],
    current: { x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, hue: 350 } as Cap | null,
    thrown: 0,
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragNow: { x: 0, y: 0 },
    done: false,
    settledFrames: 0
  });
  const particlesRef = useRef<Particle[]>([]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const s = stateRef.current;
    let raf = 0;

    const HUES = [350, 200, 45, 130, 270];

    const allCaps = () => (s.current ? [...s.caps, s.current] : s.caps);
    const anyMoving = () => allCaps().some((c) => Math.hypot(c.vx, c.vy) > 0.06);

    function physics() {
      for (const cap of allCaps()) {
        cap.x += cap.vx;
        cap.y += cap.vy;
        cap.vx *= 0.982;
        cap.vy *= 0.982;
        if (Math.hypot(cap.vx, cap.vy) < 0.06) {
          cap.vx = 0;
          cap.vy = 0;
        }
        // paredes de la mesa
        if (cap.x < 16 + CAP_R) { cap.x = 16 + CAP_R; cap.vx *= -0.7; }
        if (cap.x > W - 16 - CAP_R) { cap.x = W - 16 - CAP_R; cap.vx *= -0.7; }
        if (cap.y < 16 + CAP_R) { cap.y = 16 + CAP_R; cap.vy *= -0.7; }
        if (cap.y > H - 16 - CAP_R) { cap.y = H - 16 - CAP_R; cap.vy *= -0.7; }
      }
      // colisiones chapa-chapa (masas iguales: se intercambia la componente normal)
      const caps = allCaps();
      for (let i = 0; i < caps.length; i++) {
        for (let j = i + 1; j < caps.length; j++) {
          const a = caps[i];
          const b = caps[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0 || dist >= CAP_R * 2) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          // separar
          const overlap = CAP_R * 2 - dist;
          a.x -= (nx * overlap) / 2;
          a.y -= (ny * overlap) / 2;
          b.x += (nx * overlap) / 2;
          b.y += (ny * overlap) / 2;
          // impulso
          const va = a.vx * nx + a.vy * ny;
          const vb = b.vx * nx + b.vy * ny;
          const impactSpeed = Math.abs(va - vb);
          a.vx += (vb - va) * nx * 0.92;
          a.vy += (vb - va) * ny * 0.92;
          b.vx += (va - vb) * nx * 0.92;
          b.vy += (va - vb) * ny * 0.92;
          if (impactSpeed > 1.6) {
            spawnBurst(
              particlesRef.current,
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              ["#fef08a", "#ffffff"],
              8,
              impactSpeed * 0.6
            );
          }
        }
      }

      // ronda terminada: la chapa lanzada (y el resto) se ha parado
      if (s.current === null && !anyMoving()) {
        s.settledFrames += 1;
        if (s.settledFrames > 18) {
          s.settledFrames = 0;
          const total = s.caps.reduce((acc, cap) => acc + ringPoints(cap), 0);
          setScore(total);
          if (s.thrown >= TOTAL_CAPS) {
            if (!s.done) {
              s.done = true;
              setTimeout(() => onFinishRef.current(total), 500);
            }
          } else {
            s.current = { x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, hue: HUES[s.thrown % HUES.length] };
          }
        }
      }
    }

    function drawCap(cap: Cap, isCurrent: boolean) {
      // sombra
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(cap.x + 2, cap.y + 3.5, CAP_R, CAP_R * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // cuerpo metalico
      const grad = ctx.createRadialGradient(cap.x - 4, cap.y - 4, 2, cap.x, cap.y, CAP_R);
      grad.addColorStop(0, `hsl(${cap.hue} 85% 72%)`);
      grad.addColorStop(0.7, `hsl(${cap.hue} 70% 52%)`);
      grad.addColorStop(1, `hsl(${cap.hue} 65% 38%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, CAP_R, 0, Math.PI * 2);
      ctx.fill();
      // borde dentado de chapa
      ctx.strokeStyle = `hsl(${cap.hue} 60% 30%)`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([2.5, 2]);
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, CAP_R - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // brillo
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(cap.x - 4, cap.y - 5, 4, 2.5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      if (isCurrent) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, CAP_R + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function draw() {
      // mesa de madera
      const wood = ctx.createLinearGradient(0, 0, 0, H);
      wood.addColorStop(0, "#9a6a40");
      wood.addColorStop(1, "#7a4f2c");
      ctx.fillStyle = wood;
      ctx.fillRect(0, 0, W, H);
      // vetas
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 20 + i * 36 + Math.sin(i * 3) * 6);
        ctx.bezierCurveTo(W / 3, 26 + i * 36, (2 * W) / 3, 14 + i * 36, W, 22 + i * 36);
        ctx.stroke();
      }
      // marco
      ctx.strokeStyle = "#5b3a1e";
      ctx.lineWidth = 10;
      ctx.strokeRect(11, 11, W - 22, H - 22);

      // diana de anillos (de fuera hacia dentro)
      for (let i = RINGS.length - 1; i >= 0; i--) {
        const ring = RINGS[i];
        ctx.fillStyle = ring.color + "2e"; // relleno translucido
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(TARGET.x, TARGET.y, ring.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ring.color;
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(ring.points), TARGET.x, TARGET.y - ring.r + 12);
      }
      // centro
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(TARGET.x, TARGET.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // zona de lanzamiento
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(60, 265);
      ctx.lineTo(W - 60, 265);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const cap of s.caps) drawCap(cap, false);
      if (s.current) drawCap(s.current, true);

      // apuntado
      if (s.dragging && s.current) {
        const dx = s.dragStart.x - s.dragNow.x;
        const dy = s.dragStart.y - s.dragNow.y;
        const power = clamp(Math.hypot(dx, dy) / 130, 0, 1);
        if (power > 0.05) drawAim(ctx, s.current.x, s.current.y, dx, dy, power);
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
      if (!s.current || anyMoving() || s.done) return;
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
      if (!s.dragging || !s.current) return;
      s.dragging = false;
      const dx = s.dragStart.x - s.dragNow.x;
      const dy = s.dragStart.y - s.dragNow.y;
      const power = clamp(Math.hypot(dx, dy) / 130, 0, 1);
      if (power < 0.08) return;
      const angle = Math.atan2(dy, dx);
      const speed = power * 11;
      s.current.vx = Math.cos(angle) * speed;
      s.current.vy = Math.sin(angle) * speed;
      s.caps.push(s.current);
      s.current = null;
      s.thrown += 1;
      setThrown(s.thrown);
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

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Disc className="h-4 w-4 text-orange-500" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span className="text-ink-soft">
          Chapa {Math.min(thrown + 1, TOTAL_CAPS)}/{TOTAL_CAPS}
        </span>
      </div>
      <div className="select-none overflow-hidden rounded-xl shadow-card">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Arrastra y suelta para deslizar la chapa. Puedes empujar las que ya estan en la diana.
      </p>
    </div>
  );
}
