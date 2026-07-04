// La presencia es voluntaria pero no eterna: un "Libre" de hace 8 horas ya
// no dice nada. Caducidad EN LECTURA (sin cron): quien muestra presencia
// pasa por aqui. presenceUpdatedAt se fija al elegir estado.

export const PRESENCE_TTL_HOURS: Record<string, number> = {
  FREE: 4,
  BUSY: 4,
  STUDYING: 4,
  SLEEPING: 12
};

export function effectivePresence(
  presence: string,
  updatedAt: Date | null,
  now: Date = new Date()
): string {
  if (presence === "NONE") return "NONE";
  const ttlHours = PRESENCE_TTL_HOURS[presence];
  if (!ttlHours || !updatedAt) return "NONE";
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs > ttlHours * 3_600_000 ? "NONE" : presence;
}
