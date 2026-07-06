"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eraser, ImageDown, Loader2 } from "lucide-react";
import { canvasOpAction } from "@/actions/canvas";
import { createMomentAction } from "@/actions/moments";
import { useCoupleStream } from "@/hooks/use-stream";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import type { CanvasStroke, MemberInfo } from "@/types";

// El lienzo compartido en vivo. Cada trazo se dibuja en local y viaja al otro
// lado al instante por el bus SSE. Los puntos se guardan normalizados 0..1,
// así el dibujo escala igual en cualquier pantalla. Se puede guardar en el
// álbum como un momento (PNG).

const COLORS = ["#e11d48", "#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#1f2937", "#fbbf24"];
const SIZES = [3, 7, 14];
const BG = "#fffdf9"; // papel cálido fijo: el lienzo es siempre claro, en cualquier tema

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function SharedCanvas({
  me,
  partner,
  initialStrokes
}: {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialStrokes: CanvasStroke[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Map<string, CanvasStroke>>(new Map());
  const drawingRef = useRef<CanvasStroke | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });
  const rafRef = useRef(0);
  const lastSentRef = useRef(0);

  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function drawStroke(ctx: CanvasRenderingContext2D, s: CanvasStroke, w: number, h: number) {
    const p = s.points;
    if (p.length < 2) return;
    if (p.length === 2) {
      // un toque suelto: un punto
      ctx.beginPath();
      ctx.fillStyle = s.color;
      ctx.arc(p[0] * w, p[1] * h, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * w, p[i + 1] * h);
    ctx.stroke();
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokesRef.current.values()) drawStroke(ctx, s, w, h);
  }

  function scheduleRedraw() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      redraw();
    });
  }

  // Tamaño del lienzo (con densidad de píxel) y redibujado al redimensionar.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Siembra inicial: lo ya dibujado por la pareja (registro en memoria).
  useEffect(() => {
    for (const s of initialStrokes) strokesRef.current.set(s.id, s);
    scheduleRedraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useCoupleStream((event) => {
    if (event.type !== "canvas:op") return;
    if (event.payload.byId === me.id) return; // mis trazos ya están pintados en local
    const op = event.payload.op;
    if (op.kind === "clear") {
      strokesRef.current.clear();
      scheduleRedraw();
      return;
    }
    strokesRef.current.set(op.stroke.id, op.stroke);
    scheduleRedraw();
  });

  function sendStroke(s: CanvasStroke, force = false) {
    const now = Date.now();
    if (!force && now - lastSentRef.current < 70) return; // ~14 Hz mientras arrastra
    lastSentRef.current = now;
    // copia de points: el original sigue mutando mientras se dibuja
    void canvasOpAction({ kind: "stroke", stroke: { ...s, points: [...s.points] } });
  }

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    };
  }

  function onDown(e: React.PointerEvent) {
    canvasRef.current?.setPointerCapture(e.pointerId);
    setSaved(false);
    const { x, y } = pos(e);
    const stroke: CanvasStroke = { id: uid(), color, size, points: [x, y] };
    drawingRef.current = stroke;
    strokesRef.current.set(stroke.id, stroke);
    scheduleRedraw();
    sendStroke(stroke, true);
  }

  function onMove(e: React.PointerEvent) {
    const s = drawingRef.current;
    if (!s) return;
    const { x, y } = pos(e);
    const px = s.points[s.points.length - 2];
    const py = s.points[s.points.length - 1];
    if (Math.hypot(x - px, y - py) < 0.003) return; // suaviza y limita puntos
    s.points.push(x, y);
    // trazo muy largo: se corta y continúa con otro id (bajo el tope del validador)
    if (s.points.length >= 1800) {
      sendStroke(s, true);
      const next: CanvasStroke = { id: uid(), color: s.color, size: s.size, points: [x, y] };
      drawingRef.current = next;
      strokesRef.current.set(next.id, next);
      sendStroke(next, true);
    } else {
      sendStroke(s);
    }
    scheduleRedraw();
  }

  function onUp() {
    const s = drawingRef.current;
    if (!s) return;
    drawingRef.current = null;
    sendStroke(s, true);
  }

  function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    strokesRef.current.clear();
    drawingRef.current = null;
    scheduleRedraw();
    void canvasOpAction({ kind: "clear" });
  }

  async function saveToAlbum() {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.size === 0) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) return;
      const url = await uploadFile(blob, `lienzo-${Date.now()}.png`);
      const res = await createMomentAction({ kind: "PHOTO", imageUrl: url, title: "Nuestro lienzo" });
      if (res.ok) setSaved(true);
    } catch {
      // subida cancelada o fallida: sin ruido
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink-soft transition hover:bg-sand hover:text-ink"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-ink">Lienzo</h1>
          <p className="truncate text-sm text-ink-soft">
            {partner
              ? `Lo que dibujas aparece al instante en la pantalla de ${partner.name}.`
              : "Aún no hay nadie vinculado."}
          </p>
        </div>
      </div>

      {/* paleta y grosor */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sand bg-paper p-2.5 shadow-card">
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition",
                color === c ? "scale-110 border-ink" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="ml-1 flex items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition",
                size === s ? "border-rose bg-rose-faint" : "border-sand hover:bg-sand"
              )}
              aria-label={`Grosor ${s}`}
            >
              <span className="rounded-full bg-ink" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={clearAll}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              confirmClear
                ? "border-rose bg-rose text-white"
                : "border-sand text-ink-soft hover:bg-sand hover:text-ink"
            )}
          >
            <Eraser className="h-4 w-4" />
            {confirmClear ? "¿Borrar todo?" : "Borrar"}
          </button>
          <button
            onClick={saveToAlbum}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-rose px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            {saved ? "Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="aspect-[4/3] w-full touch-none select-none rounded-3xl border border-rose/15 shadow-card"
        style={{ backgroundColor: BG }}
      />

      <p className="text-center text-xs text-ink-soft">
        Un lienzo en blanco para los dos. Guardadlo en el álbum cuando os guste cómo ha quedado.
      </p>
    </div>
  );
}
