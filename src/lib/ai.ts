import Anthropic from "@anthropic-ai/sdk";

// Adaptador de IA de Near (patrón Spotify/S3/Redis: activado por entorno,
// dormido por defecto). Sin ANTHROPIC_API_KEY la superficie de "Citas" ni
// aparece y la API responde 503. La clave vive SOLO en el servidor.

// Sonnet 5 en vez de Opus: para planear una cita (herramientas + búsqueda
// web) rinde casi igual y cuesta bastante menos por plan. A diferencia de
// Opus, Sonnet 5 activa el pensamiento adaptativo por defecto en cuanto se le
// da margen de tokens — ver route.ts, que lo pide explícito junto con más
// max_tokens (pensamiento y respuesta comparten presupuesto).
export const AI_MODEL = "claude-sonnet-5";

// Límite diario de mensajes de IA por pareja (control de gasto).
export const AI_DAILY_LIMIT = 30;

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
