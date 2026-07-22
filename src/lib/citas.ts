import { z } from "zod";
import { timeInTz } from "@/lib/format";

// Lógica pura de "Citas" (la planificadora con IA): el esquema tipado del
// itinerario (contrato de la herramienta guardar_cita), el cálculo del
// atardecer y la construcción del system prompt. Sin dependencias de red:
// todo testeable.

// ---------------------------------------------------------------------------
// Itinerario tipado: la IA no "escribe" el plan en prosa, lo entrega como
// datos por esta herramienta. Así la tarjeta se renderiza fiable y el plan
// se puede guardar/editar.
// ---------------------------------------------------------------------------

export const planStepSchema = z.object({
  time: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Hora en formato HH:MM")
    .describe("Hora local de inicio del paso, HH:MM"),
  place: z.string().trim().min(1).max(120).describe("Lugar o actividad del paso"),
  note: z.string().trim().min(1).max(300).describe("Detalle util: qué hacer, cómo llegar, consejo"),
  cost: z.string().trim().max(40).optional().describe("Coste aproximado del paso, p. ej. '22 €'"),
  url: z.string().trim().max(500).optional().describe("Enlace para verificar o abrir (web del sitio, cartelera, o ruta interna de Near como /date-room)")
});

export const planSchema = z.object({
  title: z.string().trim().min(1).max(90).describe("Título corto y con encanto del plan"),
  mode: z.enum(["juntos", "distancia"]).describe("'juntos' = misma ciudad; 'distancia' = cita virtual"),
  city: z.string().trim().max(80).optional().describe("Ciudad del plan (modo juntos)"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Fecha del plan YYYY-MM-DD, si se ha decidido"),
  startTime: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
    .optional()
    .describe("Hora local de inicio del primer paso, HH:MM"),
  budget: z.string().trim().max(40).optional().describe("Presupuesto total aproximado, p. ej. '~50 €'"),
  steps: z.array(planStepSchema).min(2).max(10).describe("Los pasos del plan, en orden")
});

export type PlanStep = z.infer<typeof planStepSchema>;
export type DatePlanData = z.infer<typeof planSchema>;

// JSON Schema de la herramienta guardar_cita (derivado a mano del Zod de
// arriba; se mantienen juntos para que no se desincronicen).
export const GUARDAR_CITA_TOOL = {
  name: "guardar_cita",
  description:
    "Presenta el plan de cita terminado como una tarjeta de itinerario que la pareja puede guardar y proponer. Úsala SOLO cuando tengas un plan completo y concreto (tras resolver las dudas de fecha, gustos, transporte y presupuesto). No la uses para borradores a medias.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Título corto y con encanto del plan" },
      mode: { type: "string", enum: ["juntos", "distancia"], description: "'juntos' = misma ciudad; 'distancia' = cita virtual" },
      city: { type: "string", description: "Ciudad del plan (modo juntos)" },
      date: { type: "string", description: "Fecha del plan YYYY-MM-DD, si se ha decidido" },
      startTime: { type: "string", description: "Hora local de inicio, HH:MM" },
      budget: { type: "string", description: "Presupuesto total aproximado, p. ej. '~50 €'" },
      steps: {
        type: "array",
        minItems: 2,
        maxItems: 10,
        description: "Los pasos del plan, en orden",
        items: {
          type: "object",
          properties: {
            time: { type: "string", description: "Hora local HH:MM" },
            place: { type: "string", description: "Lugar o actividad" },
            note: { type: "string", description: "Detalle útil: qué hacer, cómo llegar, consejo" },
            cost: { type: "string", description: "Coste aproximado, p. ej. '22 €'" },
            url: { type: "string", description: "Enlace para verificar (web/cartelera) o ruta interna de Near (/date-room, /play/...)" }
          },
          required: ["time", "place", "note"]
        }
      }
    },
    required: ["title", "mode", "steps"]
  }
};

// ---------------------------------------------------------------------------
// Atardecer: aproximación NOAA suficiente para "ver el atardecer" (±2 min).
// Devuelve el instante UTC del ocaso para una fecha y unas coordenadas, o
// null en latitudes/fechas sin ocaso (sol de medianoche).
// ---------------------------------------------------------------------------

export function sunsetUtc(dateKey: string, lat: number, lon: number): Date | null {
  const [y, m, d] = dateKey.split("-").map(Number);
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor(
    (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000
  );
  // declinación solar y ecuación del tiempo (aproximación estándar)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + 0.5);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const zenith = 90.833 * rad; // ocaso oficial (refracción incluida)
  const cosH =
    (Math.cos(zenith) - Math.sin(lat * rad) * Math.sin(decl)) /
    (Math.cos(lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null; // sin ocaso ese día
  const hourAngle = Math.acos(cosH) / rad; // grados
  const sunsetMinutesUtc = 720 + 4 * (hourAngle - lon) - eqTime;
  return new Date(Date.UTC(y, m - 1, d) + sunsetMinutesUtc * 60_000);
}

// ---------------------------------------------------------------------------
// System prompt de la planificadora.
// ---------------------------------------------------------------------------

export type MemberContext = {
  name: string;
  city: string | null;
  timezone: string;
  lat: number | null;
  lon: number | null;
};

export type CitasContext = {
  me: MemberContext;
  partner: MemberContext | null;
  todayKey: string; // día de la pareja
  anniversary: string | null; // YYYY-MM-DD
  upcomingEvents: { title: string; whenLocal: string }[]; // próximas fechas del calendario
  overlaps: { dayLabel: string; myRange: string; partnerRange: string }[]; // franjas de Coincidir
};

// Catálogo de citas a distancia: lo que Near ya sabe hacer A LA VEZ.
export const NEAR_DISTANCE_CATALOG = [
  { path: "/date-room", what: "Sala de cine: ver la misma peli o vídeo de YouTube sincronizado, con videollamada y chat propio" },
  { path: "/play/battleship", what: "Hundir la flota en vivo (también /play/connect4, /play/gomoku, /play/reversi, /play/dots)" },
  { path: "/play", what: "Arcade con duelos en vivo con marcador en directo (meteoros, esquí, pinball...)" },
  { path: "/canvas", what: "Lienzo compartido: dibujar a la vez, juegos de dibujar y adivinar" },
  { path: "/together", what: "'Estar juntos': el cielo del otro en vivo, para dejar abierta mientras habláis" },
  { path: "/cerca", what: "Mazos de preguntas para conoceros más (Recuerdos, Sueños, El futuro...)" }
] as const;

function memberLine(m: MemberContext, now: Date): string {
  const parts = [`${m.name}: ${m.city ?? "ciudad no indicada"}`, `zona ${m.timezone}`, `hora local ahora ${timeInTz(now, m.timezone)}`];
  if (m.lat !== null && m.lon !== null) {
    const sunset = sunsetUtc(new Date().toISOString().slice(0, 10), m.lat, m.lon);
    if (sunset) parts.push(`atardecer hoy ${timeInTz(sunset, m.timezone)}`);
  }
  return parts.join(" · ");
}

export function buildCitasSystem(ctx: CitasContext): string {
  const now = new Date();
  const lines: string[] = [];
  lines.push(
    `Eres la planificadora de citas de Near, una app privada para parejas a distancia. Ayudas a ${ctx.me.name} a planear una cita con ${ctx.partner?.name ?? "su pareja"} — o presencial ("juntos", cuando coinciden en una ciudad) o a distancia (una cita virtual síncrona).`
  );
  lines.push(
    [
      "Cómo trabajas:",
      "- Habla en español de España, cálida y directa, sin cursilería impostada. Mensajes cortos: esto es un chat.",
      "- Antes de proponer el plan final, resuelve lo que falte con UNA tanda de preguntas breves (fecha/hora, gustos, transporte, presupuesto). No interrogues: máximo 3 preguntas por mensaje.",
      "- PERO si el primer mensaje ya trae modo, cuándo y presupuesto (viene de un formulario), NO preguntes nada: busca y entrega el plan directamente. Si falta algún detalle menor, elige tú lo más razonable y dilo en la tarjeta en vez de preguntar.",
      "- Para sitios reales (restaurantes, boleras, cines, miradores) usa la búsqueda web y APOYA cada sitio con su fuente. Nunca inventes horarios ni disponibilidad: propone y di 'comprueba aquí'.",
      "- Nunca afirmes haber reservado nada: Near no hace reservas.",
      "- Ten en cuenta tiempos de desplazamiento realistas entre pasos y el atardecer si el plan lo incluye.",
      "- Cuando el plan esté completo y concreto, entrégalo SIEMPRE con la herramienta guardar_cita (no lo escribas en prosa). Después de la tarjeta, un mensaje de una línea por si quieren cambiar algo.",
      "- Si piden algo fuera de planear citas/tiempo juntos, redirige con gracia a tu cometido."
    ].join("\n")
  );
  lines.push(
    [
      "Contexto de la pareja (no lo repitas de vuelta, úsalo):",
      `- ${memberLine(ctx.me, now)}`,
      ctx.partner ? `- ${memberLine(ctx.partner, now)}` : "- (sin pareja vinculada)",
      `- Hoy es ${ctx.todayKey} (día de la pareja).`,
      ctx.anniversary ? `- Su aniversario: ${ctx.anniversary}.` : "",
      ctx.upcomingEvents.length
        ? `- Próximas fechas ya en su calendario: ${ctx.upcomingEvents.map((e) => `${e.title} (${e.whenLocal})`).join("; ")}.`
        : "- No tienen fechas próximas en el calendario.",
      ctx.overlaps.length
        ? `- Franjas en las que AMBOS están libres (de su herramienta Coincidir): ${ctx.overlaps
            .map((o) => `${o.dayLabel}: ${o.myRange} hora de ${ctx.me.name} / ${o.partnerRange} hora de ${ctx.partner?.name ?? "su pareja"}`)
            .join("; ")}. Para citas a distancia, propon sobre estas franjas.`
        : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
  lines.push(
    [
      "Citas a distancia — puedes orquestar lo que Near ya tiene (usa estas rutas como url de los pasos):",
      ...NEAR_DISTANCE_CATALOG.map((c) => `- ${c.path}: ${c.what}`),
      "Combínalas con ideas fuera de la app (cocinar el mismo plato en videollamada, playlist compartida, pedir la misma cena). En los pasos, da la hora en la hora local de CADA uno cuando difieran."
    ].join("\n")
  );
  return lines.join("\n\n");
}
