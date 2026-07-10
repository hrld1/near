// Palabras para los juegos del lienzo (es-ES). Cosas dibujables y reconocibles.

export const DRAW_WORDS = [
  "gato", "casa", "sol", "árbol", "corazón", "pizza", "coche", "flor", "luna",
  "perro", "barco", "montaña", "guitarra", "helado", "cohete", "mariposa",
  "paraguas", "gafas", "cámara", "pastel", "fantasma", "robot", "cactus",
  "sombrero", "zapato", "llave", "reloj", "globo", "fresa", "pingüino",
  "avión", "tren", "abeja", "nube", "estrella", "taza", "vela", "regalo",
  "pez", "elefante", "serpiente", "dinosaurio", "castillo", "puente",
  "bicicleta", "girasol", "sirena", "unicornio", "volcán", "faro", "tienda",
  "medusa", "cangrejo", "sandía", "donut", "sushi", "búho", "koala", "rana",
  "brújula", "ancla", "diamante", "arcoíris", "seta", "hoja", "campana"
];

// Normaliza para comparar aciertos: sin tildes (la ñ -> n), minúsculas, sin
// signos ni espacios de más. Así "Pingüino!" y "pinguino" coinciden.
export function normalizeGuess(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos combinantes
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function guessMatches(guess: string, word: string): boolean {
  const g = normalizeGuess(guess);
  return g.length > 0 && g === normalizeGuess(word);
}

// Palabra al azar, evitando una anterior para no repetir seguido.
export function randomWord(exclude?: string): string {
  let w = DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)];
  if (exclude && DRAW_WORDS.length > 1) {
    let guard = 0;
    while (w === exclude && guard++ < 8) {
      w = DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)];
    }
  }
  return w;
}
