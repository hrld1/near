import { shiftDayKey, type DayKey } from "@/lib/dates";

// Parte PURA del motor de engagement: sin Prisma, testeable en Vitest.
// Las funciones async de engagement.ts consultan la BD y delegan aquí.

export type Mission = {
  id: string;
  label: string;
  points: number;
  done: boolean;
  href: string;
};

export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Racha de pareja sobre un mapa día -> miembros activos. El día de hoy
// cuenta si ambos ya entraron; si no, la racha sigue viva mientras ayer
// fuera completo. Ventana maxima: 120 días.
export function computeStreak(
  byDay: Map<string, Set<string>>,
  memberIds: string[],
  today: DayKey
) {
  const complete = (key: string) =>
    memberIds.length === 2 && memberIds.every((id) => byDay.get(key)?.has(id));

  let streak = 0;
  let cursor = complete(today) ? 0 : 1; // si hoy aún no esta completo, empezamos en ayer
  while (cursor <= 120) {
    if (complete(shiftDayKey(today, -cursor))) {
      streak++;
      cursor++;
    } else {
      break;
    }
  }
  return { streak, todayComplete: complete(today) };
}

// 3 misiones deterministas por semilla (el reto diario siempre entra).
// El algoritmo se conserva tal cual para no cambiar las misiones de un
// día ya empezado.
export function pickDailyMissions(seed: number, pool: Mission[]): Mission[] {
  const rest = pool.filter((m) => m.id !== "duel");
  const picked = [pool.find((m) => m.id === "duel")!];
  for (let i = 0; picked.length < 3 && i < rest.length; i++) {
    picked.push(rest[(seed + i * 3) % rest.length]);
    // evita duplicados
    const unique = [...new Map(picked.map((m) => [m.id, m])).values()];
    picked.length = 0;
    picked.push(...unique);
  }
  let cursor = 0;
  while (picked.length < 3 && cursor < rest.length) {
    if (!picked.some((m) => m.id === rest[cursor].id)) picked.push(rest[cursor]);
    cursor++;
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Temporada: niveles por umbral de puntos de pareja.
// ---------------------------------------------------------------------------

export const SEASON_LEVELS: { min: number; name: string }[] = [
  { min: 0, name: "Chispa" },
  { min: 120, name: "Llama" },
  { min: 320, name: "Hoguera" },
  { min: 640, name: "Constelacion" },
  { min: 1100, name: "Supernova" }
];

export function seasonLevel(points: number) {
  let level = SEASON_LEVELS[0];
  let index = 0;
  SEASON_LEVELS.forEach((l, i) => {
    if (points >= l.min) {
      level = l;
      index = i;
    }
  });
  const next = SEASON_LEVELS[index + 1] ?? null;
  return { ...level, index, next };
}
