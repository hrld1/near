import type { CanvasStroke } from "@/types";

// Registro en memoria del lienzo compartido por pareja: quien entra tarde
// recibe lo ya dibujado. Misma limitacion single-process que el bus SSE
// (ver lib/realtime.ts); con varias instancias iria a Redis/almacen externo.
// Acotado a MAX_STROKES para no crecer sin limite.

const MAX_STROKES = 600;

const globalForCanvas = globalThis as unknown as {
  nearCanvas?: Map<string, CanvasStroke[]>;
};

const store = (globalForCanvas.nearCanvas ??= new Map<string, CanvasStroke[]>());

export function getCanvasStrokes(coupleId: string): CanvasStroke[] {
  return store.get(coupleId) ?? [];
}

export function recordStroke(coupleId: string, stroke: CanvasStroke) {
  let arr = store.get(coupleId);
  if (!arr) {
    arr = [];
    store.set(coupleId, arr);
  }
  const idx = arr.findIndex((s) => s.id === stroke.id);
  if (idx >= 0) {
    arr[idx] = stroke; // trazo aun en curso: se actualiza en su sitio (z-order estable)
  } else {
    arr.push(stroke);
    if (arr.length > MAX_STROKES) arr.splice(0, arr.length - MAX_STROKES);
  }
}

export function clearCanvas(coupleId: string) {
  store.delete(coupleId);
}
