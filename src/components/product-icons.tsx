// Iconografia unica del producto. Nada de emojis en chrome de UI:
// cada concepto del sistema tiene un icono lucide y un acento propio.
import {
  AudioLines,
  Bookmark,
  BookOpen,
  CalendarCheck,
  Camera,
  Coffee,
  Flame,
  Gem,
  Gift,
  Gamepad2,
  Images,
  Layers,
  MessageCircle,
  Mic,
  Plane,
  Rocket,
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
