// Fechas con zona horaria real. Near maneja DOS claves de dia:
// - Dia del USUARIO (User.timezone): todo lo personal-diario (mood, pregunta,
//   ActivityDay, intentos de juego, claims). "Hiciste tu mood check en TU dia".
// - Dia de la PAREJA (Couple.timezone): lo compartido-determinista (caja diaria,
//   reto del dia, semilla de misiones, racha, temporada). Asi ambos miembros ven
//   la misma caja/reto aunque vivan en husos distintos.
// Todo son funciones puras sobre Intl (sin dependencias), testeadas en Vitest.

export type DayKey = string; // "YYYY-MM-DD"

// Clave de dia en una zona horaria. en-CA formatea nativamente YYYY-MM-DD.
export function dayKeyIn(timeZone: string, date: Date = new Date()): DayKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

// Clave de mes (YYYY-MM) en una zona horaria; define la temporada.
export function monthKeyIn(timeZone: string, date: Date = new Date()): string {
  return dayKeyIn(timeZone, date).slice(0, 7);
}

// Aritmetica de calendario pura sobre claves (sin zona: una clave ya es un dia).
export function shiftDayKey(dateKey: DayKey, days: number): DayKey {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Offset de una zona en un instante dado (ms). Positivo al este de UTC.
function tzOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24, // Intl puede devolver "24" a medianoche
    get("minute"),
    get("second")
  );
  return wallAsUtc - date.getTime();
}

// Instante UTC en que empieza un dia local. Doble pase para acertar en DST.
function startOfDayUtc(dateKey: DayKey, timeZone: string): Date {
  const wall = new Date(`${dateKey}T00:00:00Z`).getTime();
  let ts = wall - tzOffsetMs(timeZone, new Date(wall));
  ts = wall - tzOffsetMs(timeZone, new Date(ts));
  return new Date(ts);
}

// Rango UTC [inicio, fin) de un dia local: para filtrar por createdAt en BD.
// Los dias de cambio de hora duran 23h o 25h y aqui se respeta.
export function dayRangeUtc(dateKey: DayKey, timeZone: string): { start: Date; end: Date } {
  return {
    start: startOfDayUtc(dateKey, timeZone),
    end: startOfDayUtc(shiftDayKey(dateKey, 1), timeZone)
  };
}
