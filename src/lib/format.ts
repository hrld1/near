import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

export function timeShort(date: Date | string) {
  return format(new Date(date), "HH:mm");
}

export function dayLabel(date: Date | string) {
  const d = new Date(date);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export function dateLong(date: Date | string) {
  return format(new Date(date), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
}

export function dateShort(date: Date | string) {
  return format(new Date(date), "d MMM yyyy", { locale: es });
}

export function monthLabel(date: Date | string) {
  return format(new Date(date), "MMMM yyyy", { locale: es });
}

export function agoLabel(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

// Hora (HH:mm) de un instante en una zona horaria concreta — para mostrar la
// misma franja en las dos horas locales de la pareja.
export function timeInTz(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(date));
}

// Día (p. ej. "jueves, 12 jul") de un instante en una zona horaria concreta.
export function dayInTz(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "short"
  }).format(new Date(date));
}
