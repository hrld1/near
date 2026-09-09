// Viajes: series cortas y guiadas de varios días sobre un tema (volver a
// conoceros, preparar el reencuentro, la conversación difícil). A diferencia
// de un mazo —donde todas las cartas están abiertas y se picotean—, un viaje
// tiene ARCO y ORDEN: cada paso trae su propia guía (intro) antes de la
// pregunta, y el paso siguiente NO se abre hasta que AMBOS habéis respondido
// el actual. Esa doble condición es a propósito: no se puede acelerar en
// solitario, así que el viaje se estira en días de forma natural y se convierte
// en un motivo para volver. Reutiliza el mismo motor de reciprocidad que los
// mazos (tabla CardAnswer) con cardId = "viaje:<clave>:<paso>" — sin esquema
// nuevo. Ver src/lib/decks.ts.

import type { LucideIcon } from "lucide-react";
import { PlaneLanding, Telescope, Waves } from "lucide-react";

export type JourneyStep = {
  title: string; // nombre corto del paso
  intro: string; // la guía: enmarca la pregunta antes de leerla
  prompt: string; // la pregunta que se responde a ciegas
};

export type Journey = {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon; // trazo, coherente con la app (nunca cruza a cliente como prop)
  accent: string; // gradiente tailwind "from-x to-y"
  soft: string;
  text: string;
  steps: JourneyStep[];
};

export const JOURNEYS: Journey[] = [
  {
    key: "reconoceros",
    title: "Volver a conoceros",
    subtitle: "Cinco pasos para mirar de nuevo a quien crees que ya conoces.",
    icon: Telescope,
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    steps: [
      {
        title: "Lo que aún no sé",
        intro: "Lleváis tiempo, pero siempre queda algo por descubrir. Empecemos justo por ahí.",
        prompt: "¿Qué crees que todavía no sé de ti y te gustaría que supiera?"
      },
      {
        title: "De dónde vienes",
        intro: "Quien eres hoy tiene raíces. Cuéntame una que me ayude a entenderte mejor.",
        prompt: "¿Qué momento de tu pasado te hizo ser como eres ahora?"
      },
      {
        title: "Lo que te mueve",
        intro: "Más allá de la rutina y de lo nuestro, hay cosas que te encienden por dentro.",
        prompt: "¿Qué te ilusiona ahora mismo, aunque no tenga nada que ver conmigo?"
      },
      {
        title: "Cómo te quieren bien",
        intro: "Cada persona recibe el cariño a su manera. Ayúdame a acertar contigo.",
        prompt: "¿Qué cosa pequeña que hago —o podría hacer— te hace sentir más querido/a?"
      },
      {
        title: "Quién quieres ser",
        intro: "Terminamos mirando hacia delante, a la persona en la que te estás convirtiendo.",
        prompt: "¿En qué te gustaría parecerte más a ti mismo/a dentro de un año?"
      }
    ]
  },
  {
    key: "reencuentro",
    title: "Preparar el reencuentro",
    subtitle: "Cinco pasos para que la próxima vez que os veáis no se os escape.",
    icon: PlaneLanding,
    accent: "from-rose to-plum",
    soft: "bg-rose/12",
    text: "text-rose-deep",
    steps: [
      {
        title: "La primera imagen",
        intro: "Antes de la logística, la ilusión. Imaginad el instante exacto de veros.",
        prompt: "¿Cómo te imaginas el momento en que nos volvamos a ver?"
      },
      {
        title: "Sin planes también",
        intro: "No todo tiene que estar lleno. A veces lo mejor es el rato muerto juntos.",
        prompt: "¿Qué plan sencillo, de esos que no salen en ninguna lista, te apetece hacer conmigo?"
      },
      {
        title: "Lo que echas de menos",
        intro: "Hay cosas de estar cerca que la pantalla no da. Ponles nombre.",
        prompt: "¿Qué es lo que más echas de menos de tenerme al lado de verdad?"
      },
      {
        title: "Un día para cuidaros",
        intro: "El reencuentro también es descansar juntos. ¿Qué necesitas tú?",
        prompt: "¿Qué te gustaría que hiciéramos que te deje sintiéndote bien y en calma?"
      },
      {
        title: "Que no se nos olvide",
        intro: "Para que la prisa no se lo lleve, dejadlo dicho ahora.",
        prompt: "¿Qué quieres que recordemos hacer sí o sí cuando estemos juntos?"
      }
    ]
  },
  {
    key: "dificil",
    title: "La conversación difícil",
    subtitle: "Cinco pasos, con calma y sin culpar, para hablar de eso que cuesta.",
    icon: Waves,
    accent: "from-plum to-rose",
    soft: "bg-plum/12",
    text: "text-plum",
    steps: [
      {
        title: "Desde mí",
        intro: "Empezamos por lo propio, sin señalar. No “tú haces”, sino “a mí me pasa”.",
        prompt: "¿Qué es eso que te ronda y te gustaría poder decirme sin que acabe en discusión?"
      },
      {
        title: "Lo que siento",
        intro: "Ponerle nombre a la emoción, en vez de al reproche, baja la guardia de los dos.",
        prompt: "Cuando ocurre eso, ¿qué sientes de verdad por dentro?"
      },
      {
        title: "Lo que necesito",
        intro: "Debajo de casi toda queja hay una necesidad. Esta es la parte más importante.",
        prompt: "¿Qué necesitas de mí que ahora mismo no estás recibiendo?"
      },
      {
        title: "Una cosa concreta",
        intro: "No hace falta arreglarlo todo hoy. Un solo cambio pequeño y posible ya es mucho.",
        prompt: "¿Qué gesto concreto por mi parte te haría sentir que te he escuchado?"
      },
      {
        title: "Cerrar el círculo",
        intro: "Habéis hablado de lo que cuesta. Terminad recordándoos por qué merece la pena.",
        prompt: "¿Qué sigue estando bien entre nosotros, incluso con esto encima de la mesa?"
      }
    ]
  }
];

export function journeyByKey(key: string): Journey | null {
  return JOURNEYS.find((j) => j.key === key) ?? null;
}

// cardId de un paso: "viaje:<clave>:<paso>". Tres segmentos, así nunca colisiona
// con los cardId de mazo ("<mazo>:<índice>", dos segmentos) ni resolveCard los
// confunde (su primer segmento sería "viaje", que no es ningún mazo).
export function journeyStepCardId(journeyKey: string, index: number): string {
  return `viaje:${journeyKey}:${index}`;
}

// Devuelve viaje, índice y textos a partir de un cardId de paso, o null.
export function resolveJourneyStep(
  cardId: string
): { journey: Journey; index: number; step: JourneyStep } | null {
  const parts = cardId.split(":");
  if (parts.length !== 3 || parts[0] !== "viaje") return null;
  const journey = journeyByKey(parts[1]);
  const index = Number(parts[2]);
  if (!journey || !Number.isInteger(index) || index < 0 || index >= journey.steps.length) return null;
  return { journey, index, step: journey.steps[index] };
}
