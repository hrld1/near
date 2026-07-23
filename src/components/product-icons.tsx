// Iconografia unica del producto. Nada de emojis en chrome de UI:
// cada concepto del sistema tiene un icono lucide y un acento propio.
import {
  AudioLines,
  Blocks,
  Bookmark,
  BookOpen,
  CalendarCheck,
  Calculator,
  Camera,
  CircleDot,
  Cloud,
  Coffee,
  Disc,
  Flame,
  Gem,
  Gift,
  Gamepad2,
  Images,
  Keyboard,
  LandPlot,
  Layers,
  MessageCircle,
  Mic,
  Plane,
  Rocket,
  Snowflake,
  Sparkles,
  Stars,
  Sun,
  Swords,
  Target,
  Trophy,
  Type,
  Zap,
  type LucideIcon
} from "lucide-react";

// El acento de marca de Near: el ÚNICO degradado del producto (it36, Fase 3).
// Antes cada juego, mazo y duelo traía su propio color —lime, cyan, indigo,
// fuchsia…— y la app parecía un arcoíris que competía con su propia identidad
// rosa/ciruela. Ahora la identidad la carga el ICONO de cada cosa; el color es
// uno solo, el de Near. Un degradado reservado para los hero: no se reparte
// por cada tarjeta (las rejillas ya son planas desde it35).
export const BRAND_ACCENT = "from-rose to-plum";
export const BRAND_SOFT = "bg-rose/12";
export const BRAND_TEXT = "text-rose-deep";

// ---- Juegos: cada juego se distingue por su icono (el color es el de Near) ----
export const GAME_VISUALS: Record<string, { icon: LucideIcon }> = {
  reaction: { icon: Zap },
  memory: { icon: Layers },
  targets: { icon: Target },
  echo: { icon: AudioLines },
  anagram: { icon: Type },
  sprint: { icon: Calculator },
  typing: { icon: Keyboard },
  golf: { icon: LandPlot },
  caps: { icon: Disc },
  meteor: { icon: Rocket },
  ski: { icon: Snowflake },
  bricks: { icon: Blocks },
  climb: { icon: Cloud },
  pinball: { icon: CircleDot }
};

export function gameVisual(key: string) {
  return {
    icon: GAME_VISUALS[key]?.icon ?? Gamepad2,
    accent: BRAND_ACCENT,
    accentSoft: BRAND_SOFT,
    accentText: BRAND_TEXT
  };
}

// ---- Tipos de evento ----
export const EVENT_ICONS: Record<string, LucideIcon> = {
  DATE: Coffee,
  VISIT: Plane,
  ANNIVERSARY: Gem,
  OTHER: Bookmark
};

export function eventIcon(kind: string): LucideIcon {
  return EVENT_ICONS[kind] ?? Bookmark;
}

// ---- Niveles de temporada ----
export const LEVEL_ICONS: LucideIcon[] = [Sparkles, Flame, Sun, Stars, Rocket];

export function levelIcon(index: number): LucideIcon {
  return LEVEL_ICONS[Math.min(index, LEVEL_ICONS.length - 1)];
}

// ---- Logros ----
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  streak3: Flame,
  streak7: CalendarCheck,
  streak30: Trophy,
  firstMoment: Camera,
  photos20: Images,
  messages100: MessageCircle,
  messages1000: BookOpen,
  firstDuel: Swords,
  duels10: Gamepad2,
  boxes7: Gift,
  voice1: Mic
};

export function achievementIcon(key: string): LucideIcon {
  return ACHIEVEMENT_ICONS[key] ?? Trophy;
}
