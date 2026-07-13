import { dayRangeUtc, shiftDayKey, type DayKey } from "@/lib/dates";
import { bestOf, compareScores, gameOfDay } from "@/lib/games";

// Lógica pura de "Vuestro libro" (el Wrapped de la pareja): períodos,
// mejor racha del período, kilómetros, duelos resueltos desde los scores
// (sin una query por día) y muestreo de fotos. Todo testeable.

export type Period = {
  key: string; // "2026" o "2026-07"
  kind: "month" | "year";
  start: Date; // [start, end) en UTC según la tz de la pareja
  end: Date;
  fromKey: DayKey; // primer día del período (clave de día)
  toKey: DayKey; // último día del período
  label: string; // "julio de 2026" / "2026"
};

export function parsePeriod(raw: string | undefined, timezone: string, now = new Date()): Period {
  const fallback = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit"
  }).format(now); // YYYY-MM actual en la tz de la pareja
  const key = raw && /^\d{4}(-\d{2})?$/.test(raw) ? raw : fallback;

  if (/^\d{4}$/.test(key)) {
    const y = Number(key);
    const start = dayRangeUtc(`${y}-01-01`, timezone).start;
    const end = dayRangeUtc(`${y + 1}-01-01`, timezone).start;
    return { key, kind: "year", start, end, fromKey: `${y}-01-01`, toKey: `${y}-12-31`, label: key };
  }
  const [y, m] = key.split("-").map(Number);
  const start = dayRangeUtc(`${key}-01`, timezone).start;
  const nextKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = dayRangeUtc(`${nextKey}-01`, timezone).start;
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15))
  );
  return {
    key,
    kind: "month",
    start,
    end,
    fromKey: `${key}-01`,
    toKey: shiftDayKey(`${nextKey}-01`, -1),
    label
  };
}

// Mejor racha del período y días completos totales (ambos activos ese día).
export function bestStreakInRange(
  byDay: Map<string, Set<string>>,
  memberIds: string[],
  fromKey: DayKey,
  toKey: DayKey
): { best: number; totalComplete: number } {
  const complete = (key: string) =>
    memberIds.length === 2 && memberIds.every((id) => byDay.get(key)?.has(id));
  let best = 0;
  let run = 0;
  let totalComplete = 0;
  for (let key = fromKey, guard = 0; key <= toKey && guard < 400; key = shiftDayKey(key, 1), guard++) {
    if (complete(key)) {
      run++;
      totalComplete++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return { best, totalComplete };
}

// Distancia en km entre dos coordenadas (haversine).
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Duelos diarios resueltos EN MEMORIA desde las filas de scores del período
// (una sola query, nada de un getDuelResult por día). Reglas idénticas al
// duelo diario: cuenta el mejor score de cada uno en el juego del día.
export type ScoreRow = { userId: string; gameKey: string; dateKey: string; score: number };

export function duelsFromScores(
  rows: ScoreRow[],
  memberIds: string[]
): { played: number; wonBy: Record<string, number>; draws: number } {
  const wonBy: Record<string, number> = {};
  for (const id of memberIds) wonBy[id] = 0;
  let draws = 0;
  let played = 0;
  if (memberIds.length !== 2) return { played, wonBy, draws };

  const byDay = new Map<string, ScoreRow[]>();
  for (const row of rows) {
    if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, []);
    byDay.get(row.dateKey)!.push(row);
  }
  for (const [dateKey, dayRows] of byDay) {
    const def = gameOfDay(dateKey);
    const scoresOf = (uid: string) =>
      dayRows.filter((r) => r.gameKey === def.key && r.userId === uid).map((r) => r.score);
    const a = bestOf(def, scoresOf(memberIds[0]));
    const b = bestOf(def, scoresOf(memberIds[1]));
    if (a === null || b === null) continue; // duelo incompleto: no cuenta
    played++;
    const cmp = compareScores(def, a, b);
    if (cmp === 0) draws++;
    else if (cmp < 0) wonBy[memberIds[0]]++;
    else wonBy[memberIds[1]]++;
  }
  return { played, wonBy, draws };
}

// n elementos repartidos uniformemente (conserva el orden, incluye extremos).
export function evenSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  if (n <= 1) return [arr[0]];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.round((i * (arr.length - 1)) / (n - 1))]);
  }
  return [...new Set(out)];
}
