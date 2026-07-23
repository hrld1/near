// Mazos de preguntas ("mapas de amor"): el contenido de las cartas vive aquí,
// como datos (igual que los temas del momento o las palabras de los juegos).
// La BD solo guarda la RESPUESTA de cada persona a cada carta (CardAnswer),
// identificada por cardId = "deckKey:index". Reciprocidad por carta: ves la
// respuesta del otro solo cuando has respondido la tuya.

import type { LucideIcon } from "lucide-react";
import { Camera, Flame, HeartHandshake, Home, Sparkles } from "lucide-react";

export type Deck = {
  key: string;
  name: string;
  icon: LucideIcon; // it36: icono de trazo (antes emoji), coherente con la app
  tagline: string;
  accent: string; // gradiente tailwind "from-x to-y"
  soft: string;
  text: string;
  intimate?: boolean; // se abre con aviso (opt-in)
  cards: string[];
};

export const DECKS: Deck[] = [
  {
    key: "recuerdos",
    name: "Recuerdos",
    icon: Camera,
    tagline: "Lo que ya habéis vivido, contado de nuevo.",
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    cards: [
      "¿Cuál fue el momento en que supiste que querías estar conmigo?",
      "¿Qué recuerdo nuestro te hace sonreír sin querer?",
      "¿Cuándo te has sentido más orgulloso/a de mí?",
      "¿Qué día volverías a vivir tal cual, sin cambiar nada?",
      "¿Cuál es la primera conversación nuestra que recuerdas de verdad?",
      "¿Qué canción, olor o lugar te lleva directo a mí?",
      "¿Cuál ha sido nuestra mayor aventura juntos hasta ahora?",
      "¿Qué gesto mío te enamoró cuando aún no lo sabías?"
    ]
  },
  {
    key: "tuyyo",
    name: "Tú y yo",
    icon: HeartHandshake,
    tagline: "Cómo nos queremos, aquí y ahora.",
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    cards: [
      "¿Qué es lo que más te hace sentir querido/a por mí?",
      "¿Cuándo te sientes más cerca de mí a pesar de la distancia?",
      "¿Qué necesitas de mí que quizá no te doy lo suficiente?",
      "¿Qué hago que te calma cuando estás mal?",
      "¿En qué crees que somos un buen equipo?",
      "¿Qué pequeño detalle mío echas de menos cuando no estamos?",
      "¿Cómo te gusta que te consuele cuando tienes un mal día?",
      "¿Qué te hace sentir seguro/a en lo nuestro?"
    ]
  },
  {
    key: "suenos",
    name: "Sueños",
    icon: Sparkles,
    tagline: "Lo que os ilusiona, dicho en voz alta.",
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    cards: [
      "Si el dinero no importara, ¿cómo sería un día perfecto para los dos?",
      "¿Qué sueño tuyo aún no me has contado del todo?",
      "¿Dónde te ves dentro de cinco años, conmigo?",
      "¿Qué te gustaría que hiciéramos juntos al menos una vez en la vida?",
      "¿Qué versión de ti quieres llegar a ser?",
      "¿Qué miedo te gustaría superar, y cómo puedo ayudarte?",
      "Si pudiéramos vivir en cualquier lugar del mundo, ¿cuál elegirías?",
      "¿Qué es lo que más te ilusiona de nuestro futuro?"
    ]
  },
  {
    key: "futuro",
    name: "El futuro",
    icon: Home,
    tagline: "El nosotros que estáis construyendo.",
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    cards: [
      "¿Cómo imaginas nuestra casa cuando vivamos juntos?",
      "¿Qué tradición te gustaría que fuera solo nuestra?",
      "¿Cómo quieres que celebremos las cosas importantes?",
      "¿Qué queremos que no nos pase nunca como pareja?",
      "¿Cómo nos gustaría recordar esta época de distancia dentro de unos años?",
      "¿Qué proyecto te haría ilusión construir conmigo?",
      "¿Qué significa 'hogar' para ti?",
      "¿Qué papel quieres que tenga la familia en nuestra vida?"
    ]
  },
  {
    key: "intimidad",
    name: "Intimidad",
    icon: Flame,
    tagline: "Más cerca, con confianza. Se abre con permiso.",
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    intimate: true,
    cards: [
      "¿Qué te hace sentir más deseado/a por mí?",
      "¿Qué te gustaría que hiciéramos la próxima vez que nos veamos?",
      "¿Hay algo que te dé un poco de vergüenza pedirme y te gustaría?",
      "¿Cuándo te has sentido más conectado/a conmigo físicamente?",
      "¿Qué detalle mío te resulta irresistible?",
      "¿Cómo te gusta que te demuestre que te deseo, incluso a distancia?"
    ]
  }
];

export function deckByKey(key: string): Deck | null {
  return DECKS.find((d) => d.key === key) ?? null;
}

export function makeCardId(deckKey: string, index: number): string {
  return `${deckKey}:${index}`;
}

// Devuelve deck y texto de la carta a partir de un cardId, o null si no existe.
export function resolveCard(cardId: string): { deck: Deck; index: number; text: string } | null {
  const [deckKey, idxRaw] = cardId.split(":");
  const deck = deckByKey(deckKey);
  const index = Number(idxRaw);
  if (!deck || !Number.isInteger(index) || index < 0 || index >= deck.cards.length) return null;
  return { deck, index, text: deck.cards[index] };
}

export function totalCards(): number {
  return DECKS.reduce((n, d) => n + d.cards.length, 0);
}
