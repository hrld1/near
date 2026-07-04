export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NEAR-${code}`;
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export const MOODS: { key: string; emoji: string; label: string }[] = [
  { key: "feliz", emoji: "😊", label: "Feliz" },
  { key: "enamorada", emoji: "🥰", label: "Con amor" },
  { key: "tranquila", emoji: "😌", label: "En calma" },
  { key: "cansado", emoji: "😴", label: "Cansancio" },
  { key: "triste", emoji: "🥺", label: "Bajoneo" },
  { key: "estresado", emoji: "😮‍💨", label: "Estres" }
];

export function moodInfo(key: string) {
  return MOODS.find((m) => m.key === key) ?? { key, emoji: "💭", label: key };
}

export const PRESENCES: { key: string; label: string; dot: string }[] = [
  { key: "FREE", label: "Libre", dot: "bg-emerald-500" },
  { key: "BUSY", label: "A tope", dot: "bg-amber-500" },
  { key: "STUDYING", label: "Estudiando", dot: "bg-sky-500" },
  { key: "SLEEPING", label: "Durmiendo", dot: "bg-plum" },
  { key: "NONE", label: "Sin estado", dot: "bg-sand-deep" }
];

export function presenceInfo(key: string) {
  return PRESENCES.find((p) => p.key === key) ?? PRESENCES[4];
}

export const EVENT_KINDS: { key: string; label: string }[] = [
  { key: "DATE", label: "Cita" },
  { key: "VISIT", label: "Reencuentro" },
  { key: "ANNIVERSARY", label: "Aniversario" },
  { key: "OTHER", label: "Otro" }
];
