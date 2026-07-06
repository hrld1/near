// Fechas con zona horaria real. Near maneja DOS claves de día:
// - Día del USUARIO (User.timezone): todo lo personal-diario (mood, pregunta,
//   ActivityDay, intentos de juego, claims). "Hiciste tu mood check en TU día".
// - Día de la PAREJA (Couple.timezone): lo compartido-determinista (caja diaria,
//   reto del día, semilla de misiones, racha, temporada). Así ambos miembros ven
//   la misma caja/reto aunque vivan en husos distintos.
// Todo son funciones puras sobre Intl (sin dependencias), testeadas en Vitest.

export type DayKey = string; // "YYYY-MM-DD"

// Clave de día en una zona horaria. en-CA formatea nativamente YYYY-MM-DD.
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

// Aritmetica de calendario pura sobre claves (sin zona: una clave ya es un día).
export function shiftDayKey(dateKey: DayKey, days: number): DayKey {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Lunes de la semana ISO a la que pertenece la clave (el propio lunes se devuelve).
export function mondayOfWeek(dateKey: DayKey): DayKey {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo..6=sabado
  const isoDow = dow === 0 ? 7 : dow; // 1=lunes..7=domingo
  return shiftDayKey(dateKey, -(isoDow - 1));
}

// Suma meses clampando el día (31 de enero + 1 mes = 28/29 de febrero).
function addMonthsClamped(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

// Próximo hito del aniversario: cada mes el "mesiversario" y, cuando toca,
// el aniversario anual. Si hoy es el día, hoy ES el hito (no el siguiente).
export function nextAnniversary(anniversary: Date, now: Date = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let months =
    (today.getFullYear() - anniversary.getFullYear()) * 12 +
    (today.getMonth() - anniversary.getMonth());
  if (months < 0) months = 0;
  let date = addMonthsClamped(anniversary, months);
  if (date < today) {
    months += 1;
    date = addMonthsClamped(anniversary, months);
  }
  const isAnnual = months > 0 && months % 12 === 0;
  const daysLeft = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return { date, months, years: Math.floor(months / 12), isAnnual, daysLeft };
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

// Instante UTC en que empieza un día local. Doble pase para acertar en DST.
function startOfDayUtc(dateKey: DayKey, timeZone: string): Date {
  const wall = new Date(`${dateKey}T00:00:00Z`).getTime();
  let ts = wall - tzOffsetMs(timeZone, new Date(wall));
  ts = wall - tzOffsetMs(timeZone, new Date(ts));
  return new Date(ts);
}

// Rango UTC [inicio, fin) de un día local: para filtrar por createdAt en BD.
// Los días de cambio de hora duran 23h o 25h y aquí se respeta.
export function dayRangeUtc(dateKey: DayKey, timeZone: string): { start: Date; end: Date } {
  return {
    start: startOfDayUtc(dateKey, timeZone),
    end: startOfDayUtc(shiftDayKey(dateKey, 1), timeZone)
  };
}
