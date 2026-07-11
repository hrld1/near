"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDot } from "lucide-react";
import { clamp, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Pinball en canvas: mesa con paredes en embudo, bumpers que rebotan y dos
// flippers que golpean la bola con el impulso de su giro (velocidad del punto
// de contacto = da × radio). Toca la mitad izquierda/derecha para cada flipper
// (multitáctil). La bola cae por el centro = pierdes bola. 3 bolas. Best-score.

const W = 400;
const H = 560;
const M = 22;
const R = 9;
const GRAV = 0.3;
const MAXV = 15;
const FLIP_LEN = 58;
const FLIP_THICK = 6;

type Seg = [number, number, number, number];
type Bumper = { x: number; y: number; r: number; score: number; flash: number };
type Ball = { x: number; y: number; vx: number; vy: number };
type Flipper = { px: number; py: number; rest: number; up: number; angle: number; da: number; active: boolean };

// Contorno de la mesa + embudos hacia los flippers.
const WALLS: Seg[] = [
  [M, 70, M, H - 150],
  [W - M, 70, W - M, H - 150],
  [M, 70, 96, 44],
  [96, 44, W - 96, 44],
  [W - 96, 44, W - M, 70],
  [M, H - 150, 150, H - 58],
  [W - M, H - 150, 250, H - 58]
];

export function PinballGame({ onFinish }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [combo, setCombo] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const s = useRef({
    ball: null as Ball | null,
    trail: [] as { x: number; y: number }[],
    bumpers: [
      { x: 200, y: 132, r: 20, score: 150, flash: 0 },
      { x: 138, y: 194, r: 18, score: 100, flash: 0 },
      { x: 262, y: 194, r: 18, score: 100, flash: 0 },
      { x: 116, y: H - 132, r: 13, score: 60, flash: 0 },
      { x: 284, y: H - 132, r: 13, score: 60, flash: 0 }
    ] as Bumper[],
    flippers: [
      { px: 150, py: H - 58, rest: 0.4, up: -0.32, angle: 0.4, da: 0, active: false },
      { px: 250, py: H - 58, rest: Math.PI - 0.4, up: Math.PI + 0.32, angle: Math.PI - 0.4, da: 0, active: false }
    ] as Flipper[],
    parts: [] as Particle[],
    score: 0,
    combo: 0,
    lives: 3,
    banner: 0,
    shake: 0,
    done: false
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;

    function serve() {
      if (st.lives <= 0) {
        if (!st.done) {
          st.done = true;
          setTimeout(() => onFinishRef.current(st.score), 1000);
        }
        return;
      }
      st.ball = { x: 200, y: 82, vx: (Math.random() * 2 - 1) * 1.2, vy: 0.5 };
      st.trail = [];
      st.banner = 60;
    }
    serve();

    function collideSeg(b: Ball, seg: Seg, rest: number, thick = 0, segVx = 0, segVy = 0): boolean {
      const [ax, ay, bx, by] = seg;
      const abx = bx - ax;
      const aby = by - ay;
      const l2 = abx * abx + aby * aby || 1;
      const t = clamp(((b.x - ax) * abx + (b.y - ay) * aby) / l2, 0, 1);
      const cx = ax + abx * t;
      const cy = ay + aby * t;
      let dx = b.x - cx;
      let dy = b.y - cy;
      let dist = Math.hypot(dx, dy);
      const minD = R + thick;
      if (dist < minD) {
        if (dist < 0.001) {
          dx = 0;
          dy = -1;
          dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = cx + nx * minD;
        b.y = cy + ny * minD;
        const rvx = b.vx - segVx;
        const rvy = b.vy - segVy;
        const dot = rvx * nx + rvy * ny;
        if (dot < 0) {
          b.vx -= (1 + rest) * dot * nx;
          b.vy -= (1 + rest) * dot * ny;
        }
        return true;
      }
      return false;
    }

    function collideFlipper(b: Ball, f: Flipper) {
      const tx = f.px + Math.cos(f.angle) * FLIP_LEN;
      const ty = f.py + Math.sin(f.angle) * FLIP_LEN;
      const abx = tx - f.px;
      const aby = ty - f.py;
      const l2 = abx * abx + aby * aby || 1;
      const t = clamp(((b.x - f.px) * abx + (b.y - f.py) * aby) / l2, 0, 1);
      const cx = f.px + abx * t;
      const cy = f.py + aby * t;
      const rx = cx - f.px;
      const ry = cy - f.py;
      collideSeg(b, [cx, cy, cx, cy], 0.25, FLIP_THICK, -f.da * ry, f.da * rx);
    }

    function collideBumper(b: Ball, bm: Bumper): boolean {
      const dx = b.x - bm.x;
      const dy = b.y - bm.y;
      const dist = Math.hypot(dx, dy);
      const minD = R + bm.r;
      if (dist < minD) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        b.x = bm.x + nx * minD;
        b.y = bm.y + ny * minD;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.9 * dot * nx;
          b.vy -= 1.9 * dot * ny;
        }
        b.vx += nx * 2.4;
        b.vy += ny * 2.4;
        bm.flash = 1;
        return true;
      }
      return false;
    }

    function physics() {
      const b = st.ball;
      if (!b) return;
      b.vy += GRAV;
      b.vx *= 0.999;
      const sub = 4;
      for (let k = 0; k < sub; k++) {
        b.x += b.vx / sub;
        b.y += b.vy / sub;
        for (const w of WALLS) collideSeg(b, w, 0.45);
        for (const f of st.flippers) collideFlipper(b, f);
        for (const bm of st.bumpers) {
          if (collideBumper(b, bm)) {
            st.combo += 1;
            st.score += bm.score + st.combo * 10;
            setScore(st.score);
            setCombo(st.combo);
            spawnBurst(st.parts, bm.x, bm.y, ["#facc15", "#fde68a", "#ffffff"], 12, 3);
          }
        }
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAXV) {
        b.vx *= MAXV / sp;
        b.vy *= MAXV / sp;
      }
      st.trail.push({ x: b.x, y: b.y });
      if (st.trail.length > 7) st.trail.shift();

      // drenaje
      if (b.y - R > H) {
        st.ball = null;
        st.lives -= 1;
        st.combo = 0;
        setLivesShake();
        serve();
      }
    }

    function setLivesShake() {
      st.shake = 14;
      setBalls(st.lives);
      setCombo(0);
    }

    function frame() {
      if (!st.done) physics();

      // flippers hacia su objetivo
      for (const f of st.flippers) {
        const target = f.active ? f.up : f.rest;
        const prev = f.angle;
        f.angle += (target - f.angle) * 0.4;
        f.da = f.angle - prev;
      }

      for (const bm of st.bumpers) bm.flash = Math.max(0, bm.flash - 0.08);
      st.shake = Math.max(0, st.shake - 0.9);
      if (st.banner > 0) st.banner -= 1;

      // ---- dibujo ----
      ctx.save();
      if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#241546");
      bg.addColorStop(1, "#120b28");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // paredes (neón)
      ctx.strokeStyle = "#7c6cf0";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(124,108,240,0.8)";
      ctx.shadowBlur = 10;
      for (const [ax, ay, bx, by] of WALLS) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // bumpers
      for (const bm of st.bumpers) {
        ctx.save();
        ctx.shadowColor = "rgba(250,204,21,0.7)";
        ctx.shadowBlur = 10 + bm.flash * 20;
        const g = ctx.createRadialGradient(bm.x - 3, bm.y - 3, 2, bm.x, bm.y, bm.r);
        const lit = bm.flash > 0.1;
        g.addColorStop(0, lit ? "#fffbeb" : "#fde68a");
        g.addColorStop(1, lit ? "#f59e0b" : "#b45309");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }

      // flippers
      for (const f of st.flippers) {
        const tx = f.px + Math.cos(f.angle) * FLIP_LEN;
        const ty = f.py + Math.sin(f.angle) * FLIP_LEN;
        ctx.strokeStyle = "#fb7185";
        ctx.lineCap = "round";
        ctx.lineWidth = FLIP_THICK * 2;
        ctx.beginPath();
        ctx.moveTo(f.px, f.py);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = "#e11d48";
        ctx.beginPath();
        ctx.arc(f.px, f.py, FLIP_THICK + 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // bola con estela
      const b = st.ball;
      if (b) {
        for (let i = 0; i < st.trail.length; i++) {
          const p = st.trail[i];
          ctx.globalAlpha = (i / st.trail.length) * 0.4;
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.arc(p.x, p.y, R * (i / st.trail.length), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 8;
        const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, R);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#94a3b8");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      stepParticles(ctx, st.parts);

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 22px Georgia, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`${st.score}`, 14, 30);
      if (st.combo >= 2) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 16px Georgia, serif";
        ctx.fillText(`x${st.combo}`, W / 2, 28);
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "#fb7185";
      ctx.font = "15px sans-serif";
      ctx.fillText("●".repeat(Math.max(0, st.lives)), W - 14, 29);

      if (st.banner > 0 && !st.done) {
        ctx.fillStyle = `rgba(255,255,255,${clamp(st.banner / 60, 0, 0.9)})`;
        ctx.textAlign = "center";
        ctx.font = "600 16px sans-serif";
        ctx.fillText(`Bola ${4 - st.lives}`, W / 2, 100);
      }
      if (st.done) {
        ctx.fillStyle = "rgba(18,11,40,0.62)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 32px Georgia, serif";
        ctx.fillText("Fin de partida", W / 2, H / 2 - 6);
        ctx.font = "600 18px sans-serif";
        ctx.fillText(`${st.score} pts`, W / 2, H / 2 + 24);
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // control: cada dedo activa el flipper de su lado (multitáctil)
    const pointers = new Map<number, 0 | 1>();
    function refreshFlippers() {
      const sides = new Set(pointers.values());
      st.flippers[0].active = sides.has(0);
      st.flippers[1].active = sides.has(1);
    }
    const down = (e: PointerEvent) => {
      e.preventDefault();
      const side: 0 | 1 = pointerPos(canvas, e, W, H).x < W / 2 ? 0 : 1;
      pointers.set(e.pointerId, side);
      refreshFlippers();
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      refreshFlippers();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", up);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <CircleDot className="h-4 w-4 text-violet-500" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span className="flex items-center gap-2 text-ink-soft">
          {combo >= 2 && <b className="text-amber-500">x{combo}</b>}
          <span className="flex items-center gap-0.5 text-violet-500">
            {Array.from({ length: Math.max(0, balls) }, (_, i) => (
              <CircleDot key={i} className="h-3.5 w-3.5" />
            ))}
          </span>
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[64vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#120b28" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Toca a la izquierda o a la derecha para cada flipper. No dejes que la bola escape por el centro.
      </p>
    </div>
  );
}
