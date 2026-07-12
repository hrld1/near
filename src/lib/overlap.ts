// Lógica pura de "Coincidir": cuándo estáis libres los dos. Las franjas se
// guardan como instantes UTC, así que el solapamiento es una simple
// intersección de intervalos en milisegundos (siempre correcto, sin líos de
// zona horaria). La conversión a horas locales es solo de presentación.

export type Interval = { start: number; end: number }; // epoch ms

export const MIN_OVERLAP_MS = 15 * 60 * 1000; // no mostramos coincidencias < 15 min

// Franjas en común entre las dos listas (>= minMs), ordenadas y fusionadas si
// se tocan.
export function overlapIntervals(a: Interval[], b: Interval[], minMs = MIN_OVERLAP_MS): Interval[] {
  const raw: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end - start >= minMs) raw.push({ start, end });
    }
  }
  raw.sort((p, q) => p.start - q.start);
  const merged: Interval[] = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ start: iv.start, end: iv.end });
  }
  return merged;
}

// Recorta al futuro: mueve el inicio a `now` y descarta lo ya vencido.
export function futureIntervals(list: Interval[], now: number, minMs = MIN_OVERLAP_MS): Interval[] {
  const out: Interval[] = [];
  for (const iv of list) {
    const start = Math.max(iv.start, now);
    if (iv.end - start >= minMs) out.push({ start, end: iv.end });
  }
  return out.sort((p, q) => p.start - q.start);
}
