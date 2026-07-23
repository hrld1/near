// Registro declarativo de los duelos 1v1 EN VIVO que corren sobre el arnés
// genérico (evento `duel:signal` + hook useDuel). Añadir un juego nuevo = una
// entrada aquí + su lógica pura + su tablero + su página. La copia de push, el
// gradiente y el icono viven en un solo sitio.
//
// 4 en raya y Hundir la flota son también 1v1 en vivo, pero nacieron antes del
// arnés y conservan su propio evento/acción (funcionan bien; no se migran para
// no arriesgar regresiones). Sí aparecen en la sección "Cara a cara" de /play.

import type { LucideIcon } from "lucide-react";
import { Grid3x3, Disc3, Grip } from "lucide-react";

export type DuelMeta = {
  key: string;
  name: string;
  tagline: string; // gancho corto para la tarjeta de /play
  blurb: string; // una línea de "cómo se juega" para el lobby
  accent: string; // gradiente tailwind "from-x to-y"
  soft: string; // fondo suave del icono
  text: string; // color del icono
  emoji: string; // para el push y el lobby
  icon: LucideIcon;
};

// Color de marca de Near (it36, Fase 3): un solo sistema. Cada duelo se
// distingue por su icono, no por un color aleatorio.
const BRAND = { accent: "from-rose to-plum", soft: "bg-rose/12", text: "text-rose-deep" } as const;

export const DUELS: DuelMeta[] = [
  {
    key: "gomoku",
    name: "5 en raya",
    tagline: "Alinea cinco fichas antes que tu pareja.",
    blurb: "Por turnos, colocáis fichas en el tablero. Gana quien logre cinco en línea —horizontal, vertical o diagonal.",
    ...BRAND,
    emoji: "⚫",
    icon: Grid3x3
  },
  {
    key: "reversi",
    name: "Reversi",
    tagline: "Atrapa sus fichas y voltéalas a tu color.",
    blurb: "Encierra las fichas rivales entre dos tuyas para voltearlas. Cuando no caben más, gana quien tenga más fichas de su color.",
    ...BRAND,
    emoji: "⚪",
    icon: Disc3
  },
  {
    key: "dots",
    name: "Puntos y cajas",
    tagline: "Cierra cajas y roba turnos. El clásico del papel.",
    blurb: "Por turnos trazáis una línea entre dos puntos. Quien cierra una caja la gana y vuelve a jugar. Gana quien tenga más cajas.",
    ...BRAND,
    emoji: "🔲",
    icon: Grip
  }
];

export const DUEL_KEYS = DUELS.map((d) => d.key);

export function duelByKey(key: string): DuelMeta | null {
  return DUELS.find((d) => d.key === key) ?? null;
}
