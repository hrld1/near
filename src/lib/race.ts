// Juegos de puntuación que ya tienen modo "Duelo en vivo" (barra del rival en
// tiempo real). Se cablean por lotes: cada juego debe llamar a onProgress con
// su marcador. Añadir uno aquí lo habilita en la UI y en la acción de relay.
export const RACE_ENABLED = new Set<string>([
  "meteor",
  "ski",
  "bricks",
  "climb",
  "pinball",
  "targets",
  "sprint",
  "typing"
]);

export function raceEnabled(key: string): boolean {
  return RACE_ENABLED.has(key);
}
