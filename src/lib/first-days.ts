import { dayKeyIn, type DayKey } from "./dates";

// "El primer día" (it30): la primera semana de una pareja en Near, guiada.
// Todo se deriva de datos que ya existen — aquí solo vive la lógica pura de
// calendario y el guion de descubrimiento; nada de esquema nuevo.

// Días de calendario entre dos claves (b - a). Positivo si b es posterior.
export function daysBetweenKeys(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// Edad de la pareja en días de calendario EN SU zona: 1 = el día de vincularos.
// Se cuenta por claves de día (no por horas): vincularse a las 23:50 no os roba
// vuestro primer día.
export function coupleAgeDays(createdAt: Date, timezone: string, now: Date = new Date()): number {
  return daysBetweenKeys(dayKeyIn(timezone, createdAt), dayKeyIn(timezone, now)) + 1;
}

// Los 4 pasos del primer día. "done" se deriva de si existe CUALQUIER registro
// (no solo de hoy): el paso es descubrir la acción, no repetirla.
export type FirstStepKey = "estado" | "pregunta" | "momento" | "fecha";

export const FIRST_STEPS: {
  key: FirstStepKey;
  label: string;
  hint: string;
  href: string | null; // null = está en esta misma pantalla
}[] = [
  { key: "estado", label: "Di qué haces ahora", hint: "Las píldoras de arriba. Tu pareja lo verá al entrar.", href: null },
  { key: "pregunta", label: "Responde la pregunta del día", hint: "Su respuesta se revela cuando ambos contestáis.", href: null },
  { key: "momento", label: "Comparte el momento de hoy", hint: "Una foto de tu día, ahora. La suya se abre con la tuya.", href: null },
  { key: "fecha", label: "Marcad vuestra próxima fecha", hint: "Un reencuentro o una llamada: la cuenta atrás hace el resto.", href: "/calendar" }
];

// La primera semana: del día 2 al 7, Hoy sugiere UNA cosa nueva. Determinista
// por la edad de la pareja; sin cron, sin estado en servidor.
export type Discovery = {
  key: string;
  day: number;
  title: string;
  description: string;
  href: string;
  cta: string;
};

const DISCOVERIES: Discovery[] = [
  {
    key: "carta",
    day: 2,
    title: "Las cartas lentas",
    description: "Escribe hoy y llega mañana a las 08:00, su hora. Lo contrario de un mensaje.",
    href: "/letters",
    cta: "Escribir la primera"
  },
  {
    key: "reto",
    day: 3,
    title: "El reto del día",
    description: "Cada día, el mismo juego para los dos. El marcador decide quién manda.",
    href: "/play",
    cta: "Jugar el de hoy"
  },
  {
    key: "coincidir",
    day: 4,
    title: "Coincidir",
    description: "Marcad cuándo estáis libres y Near encuentra el hueco, en las dos horas.",
    href: "/coincidir",
    cta: "Marcar mis huecos"
  },
  {
    key: "mazo",
    day: 5,
    title: "Los mazos de Cerca",
    description: "Preguntas para conoceros más hondo. Su respuesta se abre con la tuya.",
    href: "/cerca",
    cta: "Abrir un mazo"
  },
  {
    key: "juntos",
    day: 6,
    title: "Estar juntos",
    description: "Su cielo y su hora, en directo. Para dejarla abierta mientras hacéis cada uno lo suyo.",
    href: "/together",
    cta: "Ver su cielo"
  },
  {
    key: "libro",
    day: 7,
    title: "Vuestro libro",
    description: "Vuestra primera semana ya cuenta una historia. Cada mes, un capítulo más.",
    href: "/libro",
    cta: "Abrir el libro"
  }
];

export function discoveryOfDay(ageDays: number): Discovery | null {
  return DISCOVERIES.find((d) => d.day === ageDays) ?? null;
}
