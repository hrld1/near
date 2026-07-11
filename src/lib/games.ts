// Registro de minijuegos de la arcade. Cada juego es un componente cliente
// que reporta un score numerico; aquí vive todo lo declarativo (reglas,
// direccion del score, formato) para que añadir un juego nuevo sea trivial.
// El quiz "Nos conocemos?" NO esta en este registro a proposito: no tiene
// score numerico ni intentos/día (es cooperativo y por preguntas), y meterlo
// con calzador ensuciaria el contrato GameDef. Vive en /play/quiz.

export type GameDef = {
  key: string;
  name: string;
  tagline: string;
  rules: string;
  lowerIsBetter: boolean;
  unit: string;
  maxAttemptsPerDay: number;
  // Rango fisicamente plausible del score; el servidor rechaza lo que quede
  // fuera. No impide el cheating fino (el gameplay es del cliente), pero
  // elimina los valores absurdos.
  scoreBounds: { min: number; max: number };
  format: (score: number) => string;
};

export const GAMES: GameDef[] = [
  {
    key: "reaction",
    name: "Reflejos",
    tagline: "Toca cuando se encienda. Ni antes ni tarde.",
    rules: "5 rondas. Espera al color y toca lo mas rápido posible. Si te adelantas, ronda penalizada. Cuenta la media en milisegundos.",
    lowerIsBetter: true,
    unit: "ms",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 60, max: 10_000 },
    format: (s) => `${Math.round(s)} ms`
  },
  {
    key: "memory",
    name: "Parejas",
    tagline: "Encuentra los 8 pares antes de que el reloj te coma.",
    rules: "16 cartas, 8 parejas. Tu puntuacion es el tiempo en segundos mas medio punto por cada giro. Menos es mejor.",
    lowerIsBetter: true,
    unit: "s",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 5, max: 900 },
    format: (s) => `${s.toFixed(1)} s`
  },
  {
    key: "targets",
    name: "Dianas",
    tagline: "30 segundos. Todas las dianas que puedas.",
    rules: "Aparecen dianas que encogen. Cada acierto suma 1; las dianas pequeñas valen 2. Tienes 30 segundos.",
    lowerIsBetter: false,
    unit: "pts",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 200 },
    format: (s) => `${Math.round(s)} pts`
  },
  {
    key: "echo",
    name: "Eco",
    tagline: "Repite la secuencia. Cada ronda, un paso mas.",
    rules: "Observa la secuencia de colores y repitela. Cada ronda añade un paso. Tu puntuacion es la ronda mas larga completada.",
    lowerIsBetter: false,
    unit: "rondas",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 100 },
    format: (s) => `${Math.round(s)} rondas`
  },
  {
    key: "anagram",
    name: "Palabra oculta",
    tagline: "Desordena tu cabeza, ordena las letras.",
    rules: "3 palabras desordenadas, 45 segundos cada una. Puntuas los segundos que te sobren, acumulados. Pasar resta 10.",
    lowerIsBetter: false,
    unit: "pts",
    maxAttemptsPerDay: 5,
    // 3 palabras x 45 s de margen maximo; el componente clampa a >= 0
    scoreBounds: { min: 0, max: 135 },
    format: (s) => `${Math.round(s)} pts`
  },
  {
    key: "sprint",
    name: "Sprint",
    tagline: "30 segundos de calculo a toda velocidad.",
    rules: "Operaciones rapidas con 4 opciones. Acertar suma 1, fallar resta 1. Tienes 30 segundos.",
    lowerIsBetter: false,
    unit: "pts",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 60 },
    format: (s) => `${Math.round(s)} pts`
  },
  {
    key: "typing",
    name: "Teclas",
    tagline: "Escribe mas rápido de lo que piensas.",
    rules: "Teclea la palabra y confirma con Enter o espacio. Cada palabra correcta suma 1. Tienes 45 segundos.",
    lowerIsBetter: false,
    unit: "palabras",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 60 },
    format: (s) => `${Math.round(s)} palabras`
  },
  {
    key: "golf",
    name: "Minigolf",
    tagline: "9 mapas con agua, arena, hielo y bumpers.",
    rules: "Arrastra y suelta para golpear: mas arrastre, mas fuerza. 9 hoyos con obstaculos (agua = +1 golpe y vuelves atras, arena frena, hielo resbala, bumpers rebotan). Maximo 8 golpes por hoyo. Menos golpes es mejor.",
    lowerIsBetter: true,
    unit: "golpes",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 9, max: 99 },
    format: (s) => `${Math.round(s)} golpes`
  },
  {
    key: "caps",
    name: "Chapas",
    tagline: "Desliza tus chapas al centro de la diana.",
    rules: "Arrastra cada chapa y suelta para lanzarla. 5 chapas que puntuan segun el anillo donde queden... y pueden empujarse entre si.",
    lowerIsBetter: false,
    unit: "pts",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 125 },
    format: (s) => `${Math.round(s)} pts`
  },
  {
    key: "meteor",
    name: "Meteoros",
    tagline: "Pilota, esquiva y no te estrelles.",
    rules: "Mueve el dedo para pilotar la nave. Esquiva los asteroides y recoge orbes para subir el combo. Un choque y se acaba: puntúas lo lejos que llegues.",
    lowerIsBetter: false,
    unit: "pts",
    maxAttemptsPerDay: 5,
    scoreBounds: { min: 0, max: 100_000 },
    format: (s) => `${Math.round(s)} pts`
  }
];

export function gameByKey(key: string) {
  return GAMES.find((g) => g.key === key) ?? null;
}

// Reto del día: rota de forma determinista.
export function gameOfDay(dateKey: string): GameDef {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return GAMES[dayNumber % GAMES.length];
}

export function compareScores(def: Pick<GameDef, "lowerIsBetter">, a: number, b: number) {
  if (a === b) return 0;
  const better = def.lowerIsBetter ? a < b : a > b;
  return better ? -1 : 1;
}

// Mejor marca segun la direccion del juego; null sin scores.
export function bestOf(def: Pick<GameDef, "lowerIsBetter">, scores: number[]): number | null {
  if (scores.length === 0) return null;
  return def.lowerIsBetter ? Math.min(...scores) : Math.max(...scores);
}

// Palabras para "Palabra oculta" (es-ES, 5-7 letras, sin tildes para simplificar input)
export const WORDS = [
  "abrazo", "besos", "carino", "cartas", "cielo", "citas", "corazón", "cuerpo",
  "destino", "dulce", "espera", "estrella", "fuego", "futuro", "regalo", "hogar",
  "ilusion", "lejos", "luna", "maleta", "manos", "mapa", "memoria", "mimos",
  "nube", "pareja", "peli", "planes", "playa", "promesa", "puente", "risas",
  "secreto", "sueño", "tren", "viaje", "vuelo", "juntos", "siempre", "camino",
  "aviones", "andenes", "susurro", "acento", "guino", "fotos", "música", "baile"
];

export function wordsOfDay(dateKey: string, count = 3): string[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  let seed = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const picked: string[] = [];
  const pool = [...WORDS];
  for (let i = 0; i < count && pool.length > 0; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    picked.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return picked;
}

export function scrambleWord(word: string, salt: number): string {
  const letters = word.split("");
  let seed = salt + word.length * 7;
  for (let i = letters.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const result = letters.join("");
  return result === word ? letters.reverse().join("") : result;
}
