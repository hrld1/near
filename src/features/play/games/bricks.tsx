"use client";

import { useEffect, useRef, useState } from "react";
import { Blocks, Heart } from "lucide-react";
import { clamp, pointerPos, setupHiDpi, spawnBurst, stepParticles, type Particle } from "./engine";

// Rompemuros (Breakout) en canvas: pala que sigue el dedo, bola con rebotes y
// ladrillos por MAPAS (incluido uno con forma de corazón). Al romper un
// ladrillo puede caer un power-up (pala ancha, multibola, cámara lenta). Al
// limpiar el mapa, siguiente nivel más rápido. 3 vidas. Best-score.

const W = 400;
const H = 520;
const COLS = 8;
const MARGIN = 22;
const GAP = 5;
const BRICK_W = (W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
const BRICK_H = 16;
const TOP = 66;
const PADDLE_Y = H - 42;
const PADDLE_H = 12;
const BALL_R = 7;

type Brick = { x: number; y: number; hp: number; color: string; points: number };
type Ball = { x: number; y: number; vx: number; vy: number };
type Power = { x: number; y: number; type: "wide" | "multi" | "slow" };

const ROW_COLORS = ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa"];

// Patrones de mapa: '#' = ladrillo normal, '=' = ladrillo duro (2 golpes).
const LAYOUTS: string[][] = [
  ["########", "########", "########", "========", "########"],
  [".#.##.#.", "#.####.#", "########", ".######.", "..####..", "...##..."], // corazón
  ["#.#.#.#.", ".#.#.#.#", "#.#.#.#.", ".#.#.#.#", "#.#.#.#."], // damero
  ["##....##", "###..###", "########", "###..###", "##....##"], // reloj de arena
  ["========", "#.#.#.#.", "#.#.#.#.", "#.#.#.#.", "========"] // jaula
];

function buildBricks(layout: string[]): Brick[] {
  const bricks: Brick[] = [];
  layout.forEach((row, r) => {
    for (let c = 0; c < COLS && c < row.length; c++) {
      const ch = row[c];
      if (ch !== "#" && ch !== "=") continue;
      const hard = ch === "=";
      bricks.push({
        x: MARGIN + c * (BRICK_W + GAP),
        y: TOP + r * (BRICK_H + GAP),
        hp: hard ? 2 : 1,
        color: hard ? "#94a3b8" : ROW_COLORS[r % ROW_COLORS.length],
        points: hard ? 40 : (6 - Math.min(r, 5)) * 10
      });
    }
  });
  return bricks;
}

export function BricksGame({ onFinish, onProgress }: { onFinish: (score: number) => void; onProgress?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const s = useRef({
    paddle: { cx: W / 2, w: 78 },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powers: [] as Power[],
    parts: [] as Particle[],
    level: 1,
    score: 0,
    lives: 3,
    speed: 5,
    launched: false,
    wideUntil: 0,
    slowUntil: 0,
    shake: 0,
    done: false
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const st = s.current;
    let raf = 0;

    function resetBall() {
      st.launched = false;
      st.balls = [{ x: st.paddle.cx, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 }];
    }

    function loadLevel(n: number) {
      st.bricks = buildBricks(LAYOUTS[(n - 1) % LAYOUTS.length]);
      st.speed = 5 + (n - 1) * 0.6;
      st.powers = [];
      resetBall();
    }
    loadLevel(1);

    function launch() {
      if (st.launched) return;
      st.launched = true;
      const speed = st.speed;
      for (const b of st.balls) {
        b.vx = speed * 0.4;
        b.vy = -speed;
      }
    }

    function paddleW() {
      return performance.now() < st.wideUntil ? st.paddle.w * 1.6 : st.paddle.w;
    }

    function loseBall() {
      if (st.balls.length > 0) return;
      st.lives -= 1;
      setLives(st.lives);
      st.shake = 14;
      if (st.lives <= 0) {
        if (!st.done) {
          st.done = true;
          setTimeout(() => onFinishRef.current(st.score), 900);
        }
        return;
      }
      resetBall();
    }

    function hitBrick(i: number, b: Ball) {
      const br = st.bricks[i];
      br.hp -= 1;
      spawnBurst(st.parts, b.x, b.y, [br.color, "#ffffff", "#fde68a"], 10, 2.8);
      if (br.hp <= 0) {
        st.score += br.points;
        setScore(st.score);
        onProgressRef.current?.(st.score);
        // suelta power-up con baja probabilidad
        if (Math.random() < 0.12) {
          const types: Power["type"][] = ["wide", "multi", "slow"];
          st.powers.push({ x: br.x + BRICK_W / 2, y: br.y, type: types[Math.floor(Math.random() * 3)] });
        }
        st.bricks.splice(i, 1);
        if (st.bricks.length === 0) {
          st.level += 1;
          setLevel(st.level);
          loadLevel(st.level);
        }
      } else {
        st.score += 5;
        setScore(st.score);
        onProgressRef.current?.(st.score);
      }
    }

    function stepBall(b: Ball, slow: number) {
      const sub = 3;
      for (let k = 0; k < sub; k++) {
        b.x += (b.vx * slow) / sub;
        b.y += (b.vy * slow) / sub;
        // paredes
        if (b.x < MARGIN + BALL_R) { b.x = MARGIN + BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x > W - MARGIN - BALL_R) { b.x = W - MARGIN - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y < 40 + BALL_R) { b.y = 40 + BALL_R; b.vy = Math.abs(b.vy); }
        // pala
        const pw = paddleW();
        if (
          b.vy > 0 &&
          b.y + BALL_R >= PADDLE_Y &&
          b.y < PADDLE_Y + PADDLE_H &&
          b.x > st.paddle.cx - pw / 2 - BALL_R &&
          b.x < st.paddle.cx + pw / 2 + BALL_R
        ) {
          b.y = PADDLE_Y - BALL_R;
          const rel = clamp((b.x - st.paddle.cx) / (pw / 2), -1, 1);
          const speed = Math.max(Math.hypot(b.vx, b.vy), st.speed);
          const angle = rel * 1.05;
          b.vx = speed * Math.sin(angle);
          b.vy = -Math.abs(speed * Math.cos(angle));
        }
        // ladrillos
        for (let i = 0; i < st.bricks.length; i++) {
          const br = st.bricks[i];
          const nx = clamp(b.x, br.x, br.x + BRICK_W);
          const ny = clamp(b.y, br.y, br.y + BRICK_H);
          const dx = b.x - nx;
          const dy = b.y - ny;
          if (dx * dx + dy * dy < BALL_R * BALL_R) {
            const dist = Math.hypot(dx, dy) || 0.001;
            const rnx = dx / dist;
            const rny = dist < 0.001 ? -1 : dy / dist;
            b.x = nx + rnx * BALL_R;
            b.y = ny + rny * BALL_R;
            const dot = b.vx * rnx + b.vy * rny;
            b.vx -= 2 * dot * rnx;
            b.vy -= 2 * dot * rny;
            hitBrick(i, b);
            break;
          }
        }
      }
    }

    function frame() {
      const now = performance.now();
      const slow = now < st.slowUntil ? 0.55 : 1;

      if (!st.done) {
        if (!st.launched) {
          for (const b of st.balls) {
            b.x = st.paddle.cx;
            b.y = PADDLE_Y - BALL_R - 1;
          }
        } else {
          for (const b of st.balls) stepBall(b, slow);
          st.balls = st.balls.filter((b) => b.y < H + 20);
          loseBall();
        }
        // power-ups caen
        for (let i = st.powers.length - 1; i >= 0; i--) {
          const p = st.powers[i];
          p.y += 2.4;
          const pw = paddleW();
          if (p.y > PADDLE_Y - 6 && p.y < PADDLE_Y + PADDLE_H && Math.abs(p.x - st.paddle.cx) < pw / 2 + 8) {
            if (p.type === "wide") st.wideUntil = now + 9000;
            else if (p.type === "slow") st.slowUntil = now + 6000;
            else if (p.type === "multi") {
              const extra: Ball[] = [];
              for (const b of st.balls.slice(0, 2)) {
                extra.push({ x: b.x, y: b.y, vx: -b.vx, vy: b.vy });
                extra.push({ x: b.x, y: b.y, vx: b.vy, vy: -Math.abs(b.vx) - 1 });
              }
              st.balls.push(...extra);
            }
            spawnBurst(st.parts, p.x, p.y, ["#f0abfc", "#ffffff"], 12, 3);
            st.powers.splice(i, 1);
          } else if (p.y > H + 20) {
            st.powers.splice(i, 1);
          }
        }
      }

      st.shake = Math.max(0, st.shake - 0.9);

      // ---- dibujo ----
      ctx.save();
      if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1e1b3a");
      bg.addColorStop(1, "#0f0b22");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      // marco lateral
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(0, 40, MARGIN - 6, H - 40);
      ctx.fillRect(W - MARGIN + 6, 40, MARGIN - 6, H - 40);

      // ladrillos
      for (const br of st.bricks) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(br.x + 1, br.y + 2, BRICK_W, BRICK_H);
        const g = ctx.createLinearGradient(br.x, br.y, br.x, br.y + BRICK_H);
        g.addColorStop(0, br.color);
        g.addColorStop(1, br.hp > 1 ? "#475569" : shade(br.color));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, BRICK_W, BRICK_H, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(br.x + 2, br.y + 2, BRICK_W - 4, 2);
      }

      // power-ups
      for (const p of st.powers) {
        ctx.fillStyle = p.type === "wide" ? "#22d3ee" : p.type === "multi" ? "#f0abfc" : "#a3e635";
        ctx.beginPath();
        ctx.roundRect(p.x - 9, p.y - 6, 18, 12, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.type === "wide" ? "↔" : p.type === "multi" ? "+2" : "◐", p.x, p.y + 0.5);
      }

      // pala
      const pw = paddleW();
      const wide = now < st.wideUntil;
      const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
      pg.addColorStop(0, wide ? "#67e8f9" : "#fb7185");
      pg.addColorStop(1, wide ? "#0891b2" : "#e11d48");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.roundRect(st.paddle.cx - pw / 2, PADDLE_Y, pw, PADDLE_H, 6);
      ctx.fill();

      // bolas
      for (const b of st.balls) {
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 10;
        const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      stepParticles(ctx, st.parts);

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 20px Georgia, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`${st.score}`, 14, 28);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 12px sans-serif";
      ctx.fillText(`Nivel ${st.level}`, W / 2, 26);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fb7185";
      ctx.font = "14px sans-serif";
      ctx.fillText("♥".repeat(Math.max(0, st.lives)), W - 14, 27);

      if (!st.launched && !st.done) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "center";
        ctx.font = "600 15px sans-serif";
        ctx.fillText("Toca para lanzar", W / 2, PADDLE_Y - 30);
      }
      if (st.done) {
        ctx.fillStyle = "rgba(15,11,34,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 30px Georgia, serif";
        ctx.fillText("Fin", W / 2, H / 2 - 8);
        ctx.font = "600 18px sans-serif";
        ctx.fillText(`${st.score} pts`, W / 2, H / 2 + 22);
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const move = (e: PointerEvent) => {
      e.preventDefault();
      const pw = paddleW();
      st.paddle.cx = clamp(pointerPos(canvas, e, W, H).x, MARGIN + pw / 2, W - MARGIN - pw / 2);
    };
    const down = (e: PointerEvent) => {
      move(e);
      launch();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Blocks className="h-4 w-4 text-rose-500" />
          <span className="font-display text-xl">{score}</span> pts
        </span>
        <span className="flex items-center gap-2 text-ink-soft">
          Nivel {level}
          <span className="flex items-center gap-0.5 text-rose-500">
            {Array.from({ length: Math.max(0, lives) }, (_, i) => (
              <Heart key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </span>
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="mx-auto block h-auto max-h-[64vh] w-auto touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#0f0b22" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Mueve el dedo para la pala. Rompe todos los ladrillos y no dejes caer la bola.
      </p>
    </div>
  );
}

// Oscurece un color hex para el degradado del ladrillo.
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 50);
  const g = Math.max(0, ((n >> 8) & 255) - 50);
  const b = Math.max(0, (n & 255) - 50);
  return `rgb(${r},${g},${b})`;
}
