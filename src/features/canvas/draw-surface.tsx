"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CanvasStroke } from "@/types";
import { cn } from "@/lib/utils";

// Superficie de dibujo reutilizable (lienzo libre y modos de juego). Dibuja de
// forma INCREMENTAL: cada trazo aparece al instante bajo el dedo (no depende
// de un requestAnimationFrame diferido, que era el origen de "no se dibuja
// nada"). El redibujado completo solo ocurre en cambios del modelo (tamaño,
// limpiar, trazo remoto, cargar). Coordenadas normalizadas 0..1 → escala igual
// en cualquier pantalla; tamaño con densidad de píxel (DPR) correcta.

export const CANVAS_BG = "#fffdf9"; // papel cálido fijo, en cualquier tema

export type DrawHandle = {
  applyRemoteStroke: (s: CanvasStroke) => void;
  clear: () => void;
  load: (strokes: CanvasStroke[]) => void;
  snapshot: () => CanvasStroke[];
  toBlob: () => Promise<Blob | null>;
  isEmpty: () => boolean;
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const DrawSurface = forwardRef<
  DrawHandle,
  {
    color: string;
    size: number;
    readOnly?: boolean;
    onLocalStroke?: (s: CanvasStroke, done: boolean) => void;
    className?: string;
  }
>(function DrawSurface({ color, size, readOnly, onLocalStroke, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const strokes = useRef<Map<string, CanvasStroke>>(new Map());
  const drawing = useRef<CanvasStroke | null>(null);
  const dims = useRef({ w: 1, h: 1 });
  const styleRef = useRef({ color, size });
  styleRef.current = { color, size };

  function paintDot(c: CanvasRenderingContext2D, s: CanvasStroke, x: number, y: number) {
    const { w, h } = dims.current;
    c.beginPath();
    c.fillStyle = s.color;
    c.arc(x * w, y * h, s.size / 2, 0, Math.PI * 2);
    c.fill();
  }

  function paintSegment(
    c: CanvasRenderingContext2D,
    s: CanvasStroke,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    const { w, h } = dims.current;
    c.beginPath();
    c.strokeStyle = s.color;
    c.lineWidth = s.size;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.moveTo(x0 * w, y0 * h);
    c.lineTo(x1 * w, y1 * h);
    c.stroke();
  }

  function paintStroke(c: CanvasRenderingContext2D, s: CanvasStroke) {
    const p = s.points;
    if (p.length < 2) return;
    if (p.length === 2) {
      paintDot(c, s, p[0], p[1]);
      return;
    }
    const { w, h } = dims.current;
    c.beginPath();
    c.strokeStyle = s.color;
    c.lineWidth = s.size;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i] * w, p[i + 1] * h);
    c.stroke();
  }

  function redrawAll() {
    const c = ctxRef.current;
    if (!c) return;
    const { w, h } = dims.current;
    c.clearRect(0, 0, w, h);
    c.fillStyle = CANVAS_BG;
    c.fillRect(0, 0, w, h);
    for (const s of strokes.current.values()) paintStroke(c, s);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      dims.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const c = canvas.getContext("2d");
      ctxRef.current = c;
      if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawAll();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    applyRemoteStroke(s) {
      strokes.current.set(s.id, s);
      redrawAll();
    },
    clear() {
      strokes.current.clear();
      drawing.current = null;
      redrawAll();
    },
    load(list) {
      strokes.current = new Map(list.map((s) => [s.id, s]));
      redrawAll();
    },
    snapshot() {
      return [...strokes.current.values()].map((s) => ({ ...s, points: [...s.points] }));
    },
    toBlob() {
      return new Promise((r) =>
        canvasRef.current ? canvasRef.current.toBlob(r, "image/png") : r(null)
      );
    },
    isEmpty() {
      return strokes.current.size === 0;
    }
  }));

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    };
  }

  function onDown(e: React.PointerEvent) {
    if (readOnly) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    const s: CanvasStroke = {
      id: uid(),
      color: styleRef.current.color,
      size: styleRef.current.size,
      points: [x, y]
    };
    drawing.current = s;
    strokes.current.set(s.id, s);
    const c = ctxRef.current;
    if (c) paintDot(c, s, x, y);
    onLocalStroke?.(s, false);
  }

  function onMove(e: React.PointerEvent) {
    const s = drawing.current;
    if (!s) return;
    const { x, y } = pos(e);
    const px = s.points[s.points.length - 2];
    const py = s.points[s.points.length - 1];
    if (Math.hypot(x - px, y - py) < 0.002) return;
    const c = ctxRef.current;
    if (c) paintSegment(c, s, px, py, x, y);
    s.points.push(x, y);
    // trazo muy largo: se corta y continúa con otro id (bajo el tope del validador)
    if (s.points.length >= 1800) {
      onLocalStroke?.(s, true);
      const next: CanvasStroke = { id: uid(), color: s.color, size: s.size, points: [x, y] };
      drawing.current = next;
      strokes.current.set(next.id, next);
      onLocalStroke?.(next, false);
    } else {
      onLocalStroke?.(s, false);
    }
  }

  function onUp() {
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    onLocalStroke?.(s, true);
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={cn("touch-none select-none", className)}
      style={{ backgroundColor: CANVAS_BG }}
    />
  );
});
