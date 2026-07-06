import { hashString } from "@/lib/engagement-core";

// "El momento de hoy": cada día, un tema cálido y compartido que inspira la
// foto/las palabras que os enseñáis. Determinista por el día de la pareja
// (mismo tema para los dos), como el reto o la caja. Sin estado en BD.

export const MOMENT_THEMES = [
  "Enséñale dónde estás ahora mismo",
  "Algo que te ha hecho sonreír hoy",
  "Lo que estás viendo en este momento",
  "Tu rincón favorito de hoy",
  "Lo que estás comiendo o bebiendo",
  "El cielo desde tu ventana",
  "Algo que te ha recordado a tu pareja",
  "Lo mejor de tu día, en una foto",
  "Un detalle pequeño que te ha gustado",
  "Tu cara ahora mismo, sin filtros",
  "Lo que tienes entre manos",
  "Algo bonito que has visto de camino",
  "Dónde te gustaría estar con tu pareja ahora",
  "Un color que ha tenido tu día",
  "Lo último que te ha dado paz",
  "Algo tuyo de hoy que nadie más verá"
] as const;

export function momentThemeOfDay(coupleDay: string): string {
  return MOMENT_THEMES[hashString(`moment:${coupleDay}`) % MOMENT_THEMES.length];
}
