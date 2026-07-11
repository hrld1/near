"use client";

import { useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { clamp, drawAim, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Minigolf en canvas con MAPAS variados: además de paredes de madera y rebotes,
// cada hoyo puede tener agua (te devuelve atrás y +1 golpe), arena (frena),
// hielo (resbala), bumpers (rebotan con fuerza) y una compuerta que se mueve.
// Score = golpes totales (menos es mejor); tope de golpes por hoyo.

const W = 400;
const H = 340;
const BALL_R = 8;
const HOLE_R = 12;
const MAX_STROKES = 8;

type Rect = { x: number; y: number; w: number; h: number };
type Circle = { x: number; y: number; r: number };
type Zone = { x: number; y: number; w: number; h: number };
type Mover = { x: number; y: number; w: number; h: number; axis: "x" | "y"; range: number; speed: number; phase: number };
type Hole = {
  name: string;
  ball: { x: number; y: number };
  hole: { x: number; y: number };
  par: number;
  walls?: Rect[];
  water?: Zone[];
  sand?: Zone[];
  ice?: Zone[];
  bumpers?: Circle[];
  movers?: Mover[];
  grass?: [string, string];
};

const HOLES: Hole[] = [
  {
    name: "Calle recta",
    ball: { x: 70, y: 170 },
    hole: { x: 330, y: 170 },
    par: 2
  },
  {
    name: "El recodo",
    ball: { x: 70, y: 250 },
    hole: { x: 330, y: 80 },
    par: 3,
    walls: [{ x: 190, y: 20, w: 20, h: 195 }]
  },
  {
    name: "La charca",
    ball: { x: 60, y: 170 },
    hole: { x: 340, y: 170 },
    par: 3,
    water: [{ x: 168, y: 92, w: 72, h: 156 }],
    grass: ["#4fae74", "#2f8a54"]
  },
  {
    name: "La trampa de arena",
    ball: { x: 70, y: 285 },
    hole: { x: 328, y: 74 },
    par: 3,
    sand: [{ x: 250, y: 30, w: 118, h: 96 }],
    grass: ["#63b45a", "#3f9146"]
  },
  {
    name: "Sala de bumpers",
    ball: { x: 66, y: 170 },
    hole: { x: 334, y: 170 },
    par: 3,
    bumpers: [
      { x: 175, y: 118, r: 18 },
      { x: 225, y: 222, r: 18 },
      { x: 262, y: 120, r: 14 }
    ]
  },
  {
    name: "Pista de hielo",
    ball: { x: 70, y: 290 },
    hole: { x: 332, y: 58 },
    par: 3,
    ice: [{ x: 110, y: 40, w: 210, h: 210 }],
    walls: [{ x: 110, y: 150, w: 150, h: 16 }],
    grass: ["#4a9fb0", "#2f7c90"]
  },
  {
    name: "Zigzag",
    ball: { x: 70, y: 60 },
    hole: { x: 330, y: 280 },
    par: 4,
    walls: [
      { x: 150, y: 20, w: 18, h: 152 },
      { x: 240, y: 172, w: 18, h: 150 }
    ]
  },
  {
    name: "La compuerta",
    ball: { x: 68, y: 170 },
    hole: { x: 334, y: 170 },
    par: 4,
    walls: [
      { x: 196, y: 20, w: 18, h: 66 },
      { x: 196, y: 254, w: 18, h: 66 }
    ],
    movers: [{ x: 196, y: 150, w: 18, h: 60, axis: "y", range: 44, speed: 2.1, phase: 0 }]
  },
  {
    name: "El desafío",
    ball: { x: 60, y: 292 },
    hole: { x: 340, y: 58 },
    par: 5,
    walls: [{ x: 96, y: 118, w: 128, h: 16 }],
    water: [{ x: 150, y: 205, w: 128, h: 58 }],
    bumpers: [{ x: 262, y: 150, r: 18 }],
    grass: ["#4fae74", "#2f8a54"]
  }
];

function inZones(zones: Zone[] | undefined, x: number, y: number): boolean {
  if (!zones) return false;
  for (const z of zones) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
  }
  return false;
}

function moverRect(m: Mover, t: number): Rect {
  const off = Math.sin(t * m.speed + m.phase) * m.range;
  return m.axis === "x" ? { x: m.x + off, y: m.y, w: m.w, h: m.h } : { x: m.x, y: m.y + off, w: m.w, h: m.h };
}

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
    lastRest: { x: HOLES[0].ball.x, y: HOLES[0].ball.y },
    sinking: 0,
    transitioning: false,
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragNow: { x: 0, y: 0 },
    done: false
  });
  const particlesRef = useRef<Particle[]>([]);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const s = stateRef.current;
    let raf = 0;

    const ballMoving = () => Math.hypot(s.ball.vx, s.ball.vy) > 0.06;
    const currentHole = () => HOLES[s.holeIndex];

    function flash(msg: string, ms = 800) {
      setBanner(msg);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), ms);
    }

    function nextHole(sunk: boolean) {
      s.transitioning = true;
      const label = sunk ? (s.strokes === 1 ? "¡Hoyo en uno!" : `Hoyo en ${s.strokes}`) : "Al siguiente...";
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
        s.lastRest = { x: h.ball.x, y: h.ball.y };
        s.sinking = 0;
        s.transitioning = false;
        setHoleIndex(s.holeIndex);
        setStrokes(0);
      }, 900);
    }

    function collideRect(wall: Rect) {
      const cx = clamp(s.ball.x, wall.x, wall.x + wall.w);
      const cy = clamp(s.ball.y, wall.y, wall.y + wall.h);
      const dx = s.ball.x - cx;
      const dy = s.ball.y - cy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < BALL_R * BALL_R) {
        const dist = Math.sqrt(dist2) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;
        s.ball.x = cx + nx * BALL_R;
        s.ball.y = cy + ny * BALL_R;
        const dot = s.ball.vx * nx + s.ball.vy * ny;
        s.ball.vx = (s.ball.vx - 2 * dot * nx) * 0.82;
        s.ball.vy = (s.ball.vy - 2 * dot * ny) * 0.82;
      }
    }

    function collideBumper(b: Circle) {
      const dx = s.ball.x - b.x;
      const dy = s.ball.y - b.y;
      const dist = Math.hypot(dx, dy);
      const min = b.r + BALL_R;
      if (dist < min) {
        const nx = dx / (dist || 0.001);
        const ny = dy / (dist || 0.001);
        s.ball.x = b.x + nx * min;
        s.ball.y = b.y + ny * min;
        const dot = s.ball.vx * nx + s.ball.vy * ny;
        // restitución > 1: el bumper "patea" la bola
        s.ball.vx = (s.ball.vx - 2 * dot * nx) * 1.06;
        s.ball.vy = (s.ball.vy - 2 * dot * ny) * 1.06;
        spawnBurst(particlesRef.current, b.x + nx * b.r, b.y + ny * b.r, ["#fca5a5", "#fecdd3", "#ffffff"], 8, 2.4);
      }
    }

    function physics(t: number) {
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
      const hole = currentHole();
      const steps = 3;
      for (let i = 0; i < steps; i++) {
        s.ball.x += s.ball.vx / steps;
        s.ball.y += s.ball.vy / steps;

        if (s.ball.x < 20 + BALL_R) { s.ball.x = 20 + BALL_R; s.ball.vx *= -0.82; }
        if (s.ball.x > W - 20 - BALL_R) { s.ball.x = W - 20 - BALL_R; s.ball.vx *= -0.82; }
        if (s.ball.y < 20 + BALL_R) { s.ball.y = 20 + BALL_R; s.ball.vy *= -0.82; }
        if (s.ball.y > H - 20 - BALL_R) { s.ball.y = H - 20 - BALL_R; s.ball.vy *= -0.82; }

        for (const wall of hole.walls ?? []) collideRect(wall);
        for (const m of hole.movers ?? []) collideRect(moverRect(m, t));
        for (const b of hole.bumpers ?? []) collideBumper(b);
      }

      // agua: splash, vuelves al último punto de reposo y +1 golpe
      if (inZones(hole.water, s.ball.x, s.ball.y)) {
        spawnBurst(particlesRef.current, s.ball.x, s.ball.y, ["#38bdf8", "#7dd3fc", "#e0f2fe", "#ffffff"], 20, 3);
        s.ball = { x: s.lastRest.x, y: s.lastRest.y, vx: 0, vy: 0 };
        s.total += 1;
        setTotalStrokes(s.total);
        flash("¡Al agua! +1");
        return;
      }

      // fricción según la superficie (arena frena, hielo apenas)
      const overSand = inZones(hole.sand, s.ball.x, s.ball.y);
      const overIce = inZones(hole.ice, s.ball.x, s.ball.y);
      const fr = overSand ? 0.9 : overIce ? 0.995 : 0.984;
      s.ball.vx *= fr;
      s.ball.vy *= fr;

      const h = hole.hole;
      const d = Math.hypot(s.ball.x - h.x, s.ball.y - h.y);
      const speed = Math.hypot(s.ball.vx, s.ball.vy);
      if (d < HOLE_R && speed < 3.4) {
        s.ball.vx = 0;
        s.ball.vy = 0;
        s.ball.x = h.x;
        s.ball.y = h.y;
        s.sinking = 22;
        spawnBurst(particlesRef.current, h.x, h.y, ["#4ade80", "#a3e635", "#fef08a", "#ffffff"], 26, 3.6);
      }
    }

    function drawZoneWater(z: Zone) {
      const g = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
      g.addColorStop(0, "#2f9fe0");
      g.addColorStop(1, "#1d6fb0");
      ctx.fillStyle = g;
      roundRect(z.x, z.y, z.w, z.h, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) {
        const yy = z.y + (z.h * i) / 4;
        ctx.beginPath();
        for (let xx = z.x + 4; xx < z.x + z.w - 2; xx += 8) {
          ctx.lineTo(xx, yy + Math.sin(xx * 0.4 + i) * 1.6);
        }
        ctx.stroke();
      }
    }

    function drawZoneSand(z: Zone) {
      ctx.fillStyle = "#e6cf94";
      roundRect(z.x, z.y, z.w, z.h, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(160,120,60,0.35)";
      for (let i = 0; i < 26; i++) {
        const px = z.x + 4 + Math.random() * (z.w - 8);
        const py = z.y + 4 + Math.random() * (z.h - 8);
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }

    function drawZoneIce(z: Zone) {
      const g = ctx.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h);
      g.addColorStop(0, "rgba(186,230,253,0.85)");
      g.addColorStop(1, "rgba(224,242,254,0.7)");
      ctx.fillStyle = g;
      roundRect(z.x, z.y, z.w, z.h, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(z.x + z.w * 0.2, z.y + 6);
      ctx.lineTo(z.x + z.w * 0.35, z.y + z.h * 0.5);
      ctx.lineTo(z.x + z.w * 0.25, z.y + z.h - 6);
      ctx.stroke();
    }

    function drawWood(r: Rect) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(r.x + 3, r.y + 4, r.w, r.h);
      const wood = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      wood.addColorStop(0, "#a0693c");
      wood.addColorStop(1, "#7c5230");
      ctx.fillStyle = wood;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(r.x, r.y, r.w, 3);
    }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function draw(t: number) {
      const hole = currentHole();
      const [g0, g1] = hole.grass ?? ["#59b558", "#3a8f42"];
      const grass = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 280);
      grass.addColorStop(0, g0);
      grass.addColorStop(1, g1);
      ctx.fillStyle = grass;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 8; i++) if (i % 2 === 0) ctx.fillRect(0, i * (H / 8), W, H / 8);

      // zonas (bajo las paredes)
      for (const z of hole.water ?? []) drawZoneWater(z);
      for (const z of hole.sand ?? []) drawZoneSand(z);
      for (const z of hole.ice ?? []) drawZoneIce(z);

      // borde de madera
      ctx.strokeStyle = "#7c5230";
      ctx.lineWidth = 12;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 9, W - 18, H - 18);

      for (const wall of hole.walls ?? []) drawWood(wall);
      // compuertas móviles (madera con marca de aviso)
      for (const m of hole.movers ?? []) {
        const r = moverRect(m, t);
        drawWood(r);
        ctx.fillStyle = "rgba(250,204,21,0.9)";
        for (let yy = r.y + 4; yy < r.y + r.h - 2; yy += 8) ctx.fillRect(r.x + r.w / 2 - 1.5, yy, 3, 4);
      }

      // bumpers
      for (const b of hole.bumpers ?? []) {
        ctx.save();
        ctx.shadowColor = "rgba(239,68,68,0.6)";
        ctx.shadowBlur = 12;
        const bg = ctx.createRadialGradient(b.x - 3, b.y - 3, 2, b.x, b.y, b.r);
        bg.addColorStop(0, "#fecaca");
        bg.addColorStop(1, "#dc2626");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }

      // hoyo + banderín
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
        if (power > 0.05) drawAim(ctx, s.ball.x, s.ball.y, dx, dy, power);
      }

      // bola
      const shrink = s.sinking > 0 ? s.sinking / 22 : 1;
      if (shrink > 0.05) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(s.ball.x + 2, s.ball.y + 4, BALL_R * shrink, BALL_R * 0.5 * shrink, 0, 0, Math.PI * 2);
        ctx.fill();
        const ballGrad = ctx.createRadialGradient(s.ball.x - 3, s.ball.y - 3, 1, s.ball.x, s.ball.y, BALL_R);
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
      const t = performance.now() / 1000;
      physics(t);
      draw(t);
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
      if (power < 0.08) return;
      s.lastRest = { x: s.ball.x, y: s.ball.y }; // punto seguro para el agua
      const angle = Math.atan2(dy, dx);
      const speed = power * 10.5;
      s.ball.vx = Math.cos(angle) * speed;
      s.ball.vy = Math.sin(angle) * speed;
      s.strokes += 1;
      s.total += 1;
      setStrokes(s.strokes);
      setTotalStrokes(s.total);
      if (s.strokes >= MAX_STROKES) {
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
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hole = HOLES[holeIndex];

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Flag className="h-4 w-4 text-green-600" />
          Hoyo <span className="font-display text-xl">{holeIndex + 1}</span>/{HOLES.length}
          <span className="ml-1 hidden text-xs text-ink-soft sm:inline">· {hole.name} (par {hole.par})</span>
        </span>
        <span className="text-ink-soft">
          {strokes} {strokes === 1 ? "golpe" : "golpes"} · total <b className="text-ink">{totalStrokes}</b>
        </span>
      </div>
      <div className="relative select-none overflow-hidden rounded-xl shadow-card">
        <canvas ref={canvasRef} className="block w-full touch-none" style={{ aspectRatio: `${W} / ${H}` }} />
        {banner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pop-in rounded-2xl bg-black/60 px-6 py-3 font-display text-2xl text-white backdrop-blur-sm">
              {banner}
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Arrastra y suelta para golpear. Cuidado con el agua, la arena y el hielo.
      </p>
    </div>
  );
}
