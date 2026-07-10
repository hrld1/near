"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket } from "lucide-react";
import {
  pointerPos,
  setupHiDpi,
  spawnBurst,
  stepParticles,
  clamp,
  type Particle
} from "./engine";

// Meteoros: arcade espacial. Pilotas una nave (sigue tu dedo), esquivas
// asteroides y recoges orbes para subir el combo. Nebulosa con parallax de
// estrellas, estela de propulsor, explosiones y screen shake. Un choque y
// se acaba: la puntuación es lo lejos que llegues. Todo en canvas, sin assets.

const W = 400;
const H = 520;
const SHIP_R = 12;
const TOUCH_OFFSET = 46; // la nave va por encima del dedo para verla

type Roid = { x: number; y: number; r: number; vy: number; rot: number; vrot: number; seed: number };
type Orb = { x: number; y: number; r: number; vy: number; hue: number; born: number };

export function MeteorGame({ onFinish }: { onFinish: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [combo, setCombo] = useState(1);
  const stateRef = useRef({
    ship: { x: W / 2, y: H - 90, tx: W / 2, ty: H - 90 },
    roids: [] as Roid[],
    orbs: [] as Orb[],
    parts: [] as Particle[],
    stars: [] as { x: number; y: number; z: number }[],
    score: 0,
    combo: 1,
    elapsed: 0,
    shake: 0,
    alive: true,
    started: 0,
    spawnRoid: 0,
    spawnOrb: 0,
    done: false
  });
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = setupHiDpi(canvas, W, H);
    const s = stateRef.current;
    s.started = performance.now();
    let raf = 0;
    let last = performance.now();

    // estrellas de fondo (dos profundidades para parallax)
    for (let i = 0; i < 70; i++) {
      s.stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() < 0.5 ? 0.4 : 1 });
    }

    function drawShip() {
      const { x, y } = s.ship;
      // estela de propulsor
      if (s.alive && Math.random() < 0.9) {
        s.parts.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + SHIP_R,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 1.6 + Math.random() * 1.4,
          life: 1,
          decay: 0.06,
          size: 2 + Math.random() * 2,
          color: Math.random() < 0.5 ? "#f59e0b" : "#f43f5e"
        });
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 16;
      // casco
      const g = ctx.createLinearGradient(0, -SHIP_R, 0, SHIP_R);
      g.addColorStop(0, "#ffe4e6");
      g.addColorStop(1, "#e11d48");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -SHIP_R - 4);
      ctx.quadraticCurveTo(SHIP_R, SHIP_R, 0, SHIP_R * 0.6);
      ctx.quadraticCurveTo(-SHIP_R, SHIP_R, 0, -SHIP_R - 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      // cabina
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(0, -2, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawRoid(r: Roid) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      const grad = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.3, r.r * 0.2, 0, 0, r.r);
      grad.addColorStop(0, "#9ca3af");
      grad.addColorStop(1, "#4b5563");
      ctx.fillStyle = grad;
      ctx.beginPath();
      // silueta irregular determinista por seed
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wob = 0.78 + 0.22 * Math.sin(r.seed + i * 2.3);
        const px = Math.cos(a) * r.r * wob;
        const py = Math.sin(a) * r.r * wob;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // cráteres
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let i = 0; i < 3; i++) {
        const a = r.seed + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r.r * 0.4, Math.sin(a) * r.r * 0.4, r.r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawOrb(o: Orb, t: number) {
      const pulse = 1 + 0.18 * Math.sin(t / 120 + o.born);
      ctx.save();
      ctx.shadowColor = `hsl(${o.hue} 90% 60%)`;
      ctx.shadowBlur = 18;
      const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, o.r * pulse);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, `hsl(${o.hue} 90% 65%)`);
      g.addColorStop(1, `hsl(${o.hue} 90% 45%)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function endGame() {
      if (s.done) return;
      s.done = true;
      s.alive = false;
      spawnBurst(s.parts, s.ship.x, s.ship.y, ["#f59e0b", "#f43f5e", "#ffffff", "#fca5a5"], 40, 5);
      s.shake = 18;
      setTimeout(() => onFinishRef.current(Math.round(s.score)), 900);
    }

    function frame(now: number) {
      const dt = Math.min(40, now - last) / 16.67; // en "frames" de 60fps
      last = now;
      if (s.alive) s.elapsed = (now - s.started) / 1000;
      const diff = 1 + s.elapsed / 22; // dificultad creciente

      // --- update ---
      if (s.alive) {
        s.ship.x += (s.ship.tx - s.ship.x) * 0.25;
        s.ship.y += (s.ship.ty - s.ship.y) * 0.25;
        s.score += dt * 0.9 * s.combo * 0.5; // renta por sobrevivir

        s.spawnRoid -= dt;
        if (s.spawnRoid <= 0) {
          s.spawnRoid = Math.max(14, 46 - s.elapsed * 0.7);
          const r = 12 + Math.random() * 20;
          s.roids.push({
            x: 20 + Math.random() * (W - 40),
            y: -30,
            r,
            vy: (1.4 + Math.random() * 1.2) * diff,
            rot: Math.random() * 6,
            vrot: (Math.random() - 0.5) * 0.08,
            seed: Math.random() * 6
          });
        }
        s.spawnOrb -= dt;
        if (s.spawnOrb <= 0) {
          s.spawnOrb = 55 + Math.random() * 40;
          s.orbs.push({
            x: 24 + Math.random() * (W - 48),
            y: -20,
            r: 7,
            vy: (1.6 + Math.random() * 0.8) * diff,
            hue: [45, 190, 320, 130][Math.floor(Math.random() * 4)],
            born: Math.random() * 6
          });
        }
      }

      for (const r of s.roids) {
        r.y += r.vy * dt;
        r.rot += r.vrot * dt;
      }
      for (const o of s.orbs) o.y += o.vy * dt;

      // colisiones
      if (s.alive) {
        for (const r of s.roids) {
          if (Math.hypot(r.x - s.ship.x, r.y - s.ship.y) < r.r * 0.82 + SHIP_R) {
            endGame();
            break;
          }
        }
        for (const o of s.orbs) {
          if (o.y > -20 && Math.hypot(o.x - s.ship.x, o.y - s.ship.y) < o.r + SHIP_R + 2) {
            o.y = H + 100; // marcar para retirar
            s.combo = Math.min(9, s.combo + 1);
            setCombo(s.combo);
            s.score += 12 * s.combo;
            s.shake = Math.min(s.shake + 3, 8);
            spawnBurst(s.parts, o.x, o.y, [`hsl(${o.hue} 90% 65%)`, "#ffffff"], 14, 3);
          }
        }
      }
      s.roids = s.roids.filter((r) => r.y < H + 40);
      s.orbs = s.orbs.filter((o) => o.y < H + 30);

      // --- draw ---
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.88;
        if (s.shake < 0.4) s.shake = 0;
      }
      // nebulosa
      const neb = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.5, H * 0.8);
      neb.addColorStop(0, "#241443");
      neb.addColorStop(0.6, "#140b2e");
      neb.addColorStop(1, "#080513");
      ctx.fillStyle = neb;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      // estrellas con parallax
      for (const st of s.stars) {
        st.y += (0.3 + st.z * 0.9) * diff * dt;
        if (st.y > H) {
          st.y = 0;
          st.x = Math.random() * W;
        }
        ctx.globalAlpha = 0.3 + st.z * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(st.x, st.y, st.z < 0.6 ? 1 : 1.8, st.z < 0.6 ? 1 : 1.8);
      }
      ctx.globalAlpha = 1;

      const t = now;
      for (const o of s.orbs) drawOrb(o, t);
      for (const r of s.roids) drawRoid(r);
      if (s.alive) drawShip();
      stepParticles(ctx, s.parts);
      ctx.restore();

      // HUD (sin shake)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText(String(Math.round(s.score)), 14, 30);
      ctx.textAlign = "right";
      ctx.fillStyle = s.combo > 1 ? "#fbbf24" : "rgba(255,255,255,0.55)";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`x${s.combo}`, W - 14, 28);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function move(e: PointerEvent) {
      if (!s.alive) return;
      const p = pointerPos(canvas, e, W, H);
      s.ship.tx = clamp(p.x, SHIP_R, W - SHIP_R);
      s.ship.ty = clamp(p.y - TOUCH_OFFSET, SHIP_R, H - SHIP_R);
    }
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      move(e);
    });
    canvas.addEventListener("pointermove", move);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <Rocket className="h-4 w-4 text-rose" /> Meteoros
        </span>
        <span className="text-ink-soft">
          Combo <b className="text-ink">x{combo}</b>
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-card">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          style={{ aspectRatio: `${W} / ${H}`, background: "#080513" }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Mueve el dedo para pilotar. Esquiva las rocas y recoge orbes para subir el combo.
      </p>
    </div>
  );
}
