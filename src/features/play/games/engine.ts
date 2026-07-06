// Mini-motor para los juegos canvas de la arcade: HiDPI, mapeo de punteros
// y un sistema de particulas ligero. Los juegos dibujan a 60fps con
// requestAnimationFrame y solo usan React para el HUD.

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  decay: number;
  size: number;
  color: string;
  gravity?: number;
};

// Escala el canvas al devicePixelRatio manteniendo coordenadas logicas w x h.
export function setupHiDpi(
  canvas: HTMLCanvasElement,
  w: number,
  h: number
): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// Posición del puntero en coordenadas logicas del canvas.
export function pointerPos(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
  w: number,
  h: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * w,
    y: ((e.clientY - rect.top) / rect.height) * h
  };
}

export function spawnBurst(
  particles: Particle[],
  x: number,
  y: number,
  colors: string[],
  count = 16,
  speed = 3.2
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 1,
      decay: 0.02 + Math.random() * 0.025,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.05
    });
  }
}

// Avanza y dibuja las particulas vivas (muta el array in place).
export function stepParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity ?? 0;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Flecha de apuntado estilo tirachinas: linea discontinua + punta, con el
// color segun la potencia (verde -> ambar -> rojo).
export function drawAim(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  dirX: number,
  dirY: number,
  power: number // 0..1
) {
  const len = 26 + power * 68;
  const angle = Math.atan2(dirY, dirX);
  const toX = fromX + Math.cos(angle) * len;
  const toY = fromY + Math.sin(angle) * len;
  const color =
    power < 0.45 ? "#4ade80" : power < 0.8 ? "#fbbf24" : "#f87171";

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 6]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.setLineDash([]);
  // punta de flecha
  ctx.beginPath();
  ctx.moveTo(toX + Math.cos(angle) * 9, toY + Math.sin(angle) * 9);
  ctx.lineTo(toX + Math.cos(angle + 2.5) * 8, toY + Math.sin(angle + 2.5) * 8);
  ctx.lineTo(toX + Math.cos(angle - 2.5) * 8, toY + Math.sin(angle - 2.5) * 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
