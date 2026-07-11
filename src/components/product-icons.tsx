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

// ---- Juegos: icono + acento propio (identidad por juego) ----
export const GAME_VISUALS: Record<
  string,
  { icon: LucideIcon; accent: string; accentSoft: string; accentText: string }
> = {
  reaction: {
    icon: Zap,
    accent: "from-amber-400 to-orange-500",
    accentSoft: "bg-amber-500/12",
    accentText: "text-amber-600 dark:text-amber-400"
  },
  memory: {
    icon: Layers,
    accent: "from-violet-400 to-purple-600",
    accentSoft: "bg-violet-500/12",
    accentText: "text-violet-600 dark:text-violet-400"
  },
  targets: {
    icon: Target,
    accent: "from-rose to-rose-deep",
    accentSoft: "bg-rose/12",
    accentText: "text-rose-deep"
  },
  echo: {
    icon: AudioLines,
    accent: "from-sky-400 to-blue-600",
    accentSoft: "bg-sky-500/12",
    accentText: "text-sky-600 dark:text-sky-400"
  },
  anagram: {
    icon: Type,
    accent: "from-emerald-400 to-teal-600",
    accentSoft: "bg-emerald-500/12",
    accentText: "text-emerald-600 dark:text-emerald-400"
  },
  sprint: {
    icon: Calculator,
    accent: "from-fuchsia-400 to-pink-600",
    accentSoft: "bg-fuchsia-500/12",
    accentText: "text-fuchsia-600 dark:text-fuchsia-400"
  },
  typing: {
    icon: Keyboard,
    accent: "from-cyan-400 to-indigo-500",
    accentSoft: "bg-cyan-500/12",
    accentText: "text-cyan-600 dark:text-cyan-400"
  },
  golf: {
    icon: LandPlot,
    accent: "from-lime-400 to-green-600",
    accentSoft: "bg-lime-500/12",
    accentText: "text-lime-700 dark:text-lime-400"
  },
  caps: {
    icon: Disc,
    accent: "from-orange-400 to-red-500",
    accentSoft: "bg-orange-500/12",
    accentText: "text-orange-600 dark:text-orange-400"
  },
  meteor: {
    icon: Rocket,
    accent: "from-indigo-500 to-fuchsia-600",
    accentSoft: "bg-indigo-500/12",
    accentText: "text-indigo-600 dark:text-indigo-400"
  },
  ski: {
    icon: Snowflake,
    accent: "from-sky-300 to-blue-500",
    accentSoft: "bg-sky-500/12",
    accentText: "text-sky-600 dark:text-sky-400"
  },
  bricks: {
    icon: Blocks,
    accent: "from-rose-400 to-orange-500",
    accentSoft: "bg-rose-500/12",
    accentText: "text-rose-600 dark:text-rose-400"
  },
  climb: {
    icon: Cloud,
    accent: "from-emerald-400 to-sky-500",
    accentSoft: "bg-emerald-500/12",
    accentText: "text-emerald-600 dark:text-emerald-400"
  },
  pinball: {
    icon: CircleDot,
    accent: "from-purple-500 to-indigo-700",
    accentSoft: "bg-purple-500/12",
    accentText: "text-purple-600 dark:text-purple-400"
  }
};

export function gameVisual(key: string) {
  return (
    GAME_VISUALS[key] ?? {
      icon: Gamepad2,
      accent: "from-rose to-plum",
      accentSoft: "bg-rose/12",
      accentText: "text-rose-deep"
    }
  );
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
