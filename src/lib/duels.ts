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

export const DUELS: DuelMeta[] = [
  {
    key: "gomoku",
    name: "5 en raya",
    tagline: "Alinea cinco fichas antes que tu pareja.",
    blurb: "Por turnos, colocáis fichas en el tablero. Gana quien logre cinco en línea —horizontal, vertical o diagonal.",
    accent: "from-teal-400 to-emerald-600",
    soft: "bg-teal-500/12",
    text: "text-teal-600 dark:text-teal-400",
    emoji: "⚫",
    icon: Grid3x3
  },
  {
    key: "reversi",
    name: "Reversi",
    tagline: "Atrapa sus fichas y voltéalas a tu color.",
    blurb: "Encierra las fichas rivales entre dos tuyas para voltearlas. Cuando no caben más, gana quien tenga más fichas de su color.",
    accent: "from-violet-400 to-purple-700",
    soft: "bg-violet-500/12",
    text: "text-violet-600 dark:text-violet-400",
    emoji: "⚪",
    icon: Disc3
  },
  {
    key: "dots",
    name: "Puntos y cajas",
    tagline: "Cierra cajas y roba turnos. El clásico del papel.",
    blurb: "Por turnos trazáis una línea entre dos puntos. Quien cierra una caja la gana y vuelve a jugar. Gana quien tenga más cajas.",
    accent: "from-amber-400 to-orange-600",
    soft: "bg-amber-500/12",
    text: "text-amber-600 dark:text-amber-400",
    emoji: "🔲",
    icon: Grip
  }
];

export const DUEL_KEYS = DUELS.map((d) => d.key);

export function duelByKey(key: string): DuelMeta | null {
  return DUELS.find((d) => d.key === key) ?? null;
}
