import Anthropic from "@anthropic-ai/sdk";

// Adaptador de IA de Near (patrón Spotify/S3/Redis: activado por entorno,
// dormido por defecto). Sin ANTHROPIC_API_KEY la superficie de "Citas" ni
// aparece y la API responde 503. La clave vive SOLO en el servidor.

export const AI_MODEL = "claude-opus-4-8";

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
