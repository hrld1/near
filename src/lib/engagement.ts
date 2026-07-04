import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Motor de engagement de Near.
// ActivityDay es la unica fuente de verdad de puntos. Racha, misiones,
// temporada y logros se DERIVAN de datos reales (mensajes, moods, juegos...):
// no hay contadores paralelos que mantener sincronizados.
// ---------------------------------------------------------------------------

export const POINTS = {
  firstMessageOfDay: 2,
  mood: 5,
  prompt: 5,
  nudge: 2,
  moment: 5,
  gamePlayed: 10,
  duelWon: 15,
  boxOpened: 5,
  missionBonus: 20,
  weeklyBonus: 40
} as const;

export async function addPoints(coupleId: string, userId: string, points: number) {
  const dateKey = todayKey();
  await prisma.activityDay.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: { points: { increment: points } },
    create: { coupleId, userId, dateKey, points }
  });
}

// Marca actividad sin puntos (cuenta para la racha)
export async function touchActivity(coupleId: string, userId: string) {
  await addPoints(coupleId, userId, 0);
}

function shiftKey(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Racha de PAREJA: dias consecutivos en los que AMBOS estuvieron activos.
// El dia de hoy cuenta si ambos ya entraron; si no, la racha sigue viva
// mientras ayer fuera completo.
export async function getCoupleStreak(coupleId: string, memberIds: string[]) {
  const since = shiftKey(new Date(), 120);
  const rows = await prisma.activityDay.findMany({
    where: { coupleId, dateKey: { gte: since } },
    select: { userId: true, dateKey: true }
  });
  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, new Set());
    byDay.get(row.dateKey)!.add(row.userId);
  }
  const complete = (key: string) =>
    memberIds.length === 2 && memberIds.every((id) => byDay.get(key)?.has(id));

  const now = new Date();
  const today = todayKey(now);
  let streak = 0;
  let cursor = complete(today) ? 0 : 1; // si hoy aun no esta completo, empezamos en ayer
  while (cursor <= 120) {
    if (complete(shiftKey(now, cursor))) {
      streak++;
      cursor++;
    } else {
      break;
    }
  }
  const todayComplete = complete(today);
  return { streak, todayComplete };
}

// ---------------------------------------------------------------------------
// Temporada: mes natural. Puntos por miembro y total de pareja.
// ---------------------------------------------------------------------------

export function seasonKey(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

export const SEASON_LEVELS: { min: number; name: string }[] = [
  { min: 0, name: "Chispa" },
  { min: 120, name: "Llama" },
  { min: 320, name: "Hoguera" },
  { min: 640, name: "Constelacion" },
  { min: 1100, name: "Supernova" }
];

export function seasonLevel(points: number) {
  let level = SEASON_LEVELS[0];
  let index = 0;
  SEASON_LEVELS.forEach((l, i) => {
    if (points >= l.min) {
      level = l;
      index = i;
    }
  });
  const next = SEASON_LEVELS[index + 1] ?? null;
  return { ...level, index, next };
}

export async function getSeason(coupleId: string) {
  const prefix = seasonKey();
  const rows = await prisma.activityDay.groupBy({
    by: ["userId"],
    where: { coupleId, dateKey: { startsWith: prefix } },
    _sum: { points: true }
  });
  const perUser = new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  const total = rows.reduce((acc, r) => acc + (r._sum.points ?? 0), 0);
  const daysLeft = (() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(0, end.getDate() - now.getDate());
  })();
  return { key: prefix, perUser, total, level: seasonLevel(total), daysLeft };
}

// ---------------------------------------------------------------------------
// Misiones: se calculan sobre datos reales del dia. 3 diarias rotativas
// (deterministas por fecha+pareja) + bonus reclamable al completarlas.
// ---------------------------------------------------------------------------

export type Mission = {
  id: string;
  label: string;
  points: number;
  done: boolean;
  href: string;
};

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export async function getDailyMissions(
  coupleId: string,
  userId: string,
  dateKey = todayKey()
): Promise<{ missions: Mission[]; allDone: boolean; bonusClaimed: boolean }> {
  const startOfDay = new Date(`${dateKey}T00:00:00`);
  const [mood, prompt, moments, photoMsg, nudges, games, boxOpen, claim] = await Promise.all([
    prisma.moodEntry.findFirst({ where: { userId, dateKey } }),
    prisma.promptAnswer.findFirst({ where: { userId, dateKey } }),
    prisma.moment.count({ where: { authorId: userId, createdAt: { gte: startOfDay } } }),
    prisma.message.count({
      where: { senderId: userId, kind: "IMAGE", createdAt: { gte: startOfDay } }
    }),
    prisma.nudge.count({ where: { fromId: userId, createdAt: { gte: startOfDay } } }),
    prisma.gameScore.count({ where: { userId, dateKey } }),
    prisma.dailyBox.findUnique({ where: { coupleId_dateKey: { coupleId, dateKey } } }),
    prisma.dailyClaim.findUnique({
      where: { userId_dateKey_type: { userId, dateKey, type: "DAILY_MISSIONS" } }
    })
  ]);

  const pool: Mission[] = [
    { id: "mood", label: "Haz tu mood check de hoy", points: 5, done: !!mood, href: "/home" },
    { id: "prompt", label: "Responde la pregunta del dia", points: 5, done: !!prompt, href: "/home" },
    { id: "duel", label: "Juega el reto diario de la arcade", points: 10, done: games > 0, href: "/play" },
    { id: "moment", label: "Guarda un momento o una foto", points: 5, done: moments > 0, href: "/moments" },
    { id: "photo", label: "Envia una foto por el chat", points: 5, done: photoMsg > 0, href: "/chat" },
    { id: "nudge", label: "Manda un 'pensando en ti'", points: 2, done: nudges > 0, href: "/home" },
    { id: "box", label: "Abrid la caja del dia", points: 5, done: !!boxOpen, href: "/home" }
  ];

  // 3 misiones deterministas por dia y pareja (el reto diario siempre entra)
  const seed = hashString(`${dateKey}:${coupleId}`);
  const rest = pool.filter((m) => m.id !== "duel");
  const picked = [pool.find((m) => m.id === "duel")!];
  for (let i = 0; picked.length < 3 && i < rest.length; i++) {
    picked.push(rest[(seed + i * 3) % rest.length]);
    // evita duplicados
    const unique = [...new Map(picked.map((m) => [m.id, m])).values()];
    picked.length = 0;
    picked.push(...unique);
  }
  let cursor = 0;
  while (picked.length < 3 && cursor < rest.length) {
    if (!picked.some((m) => m.id === rest[cursor].id)) picked.push(rest[cursor]);
    cursor++;
  }

  const allDone = picked.every((m) => m.done);
  return { missions: picked, allDone, bonusClaimed: !!claim };
}

// ---------------------------------------------------------------------------
// Logros: computados sobre datos reales; el desbloqueo se persiste para
// poder ensenar "nuevo" y la fecha.
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: { key: string; name: string; description: string }[] = [
  { key: "streak3", name: "Tres seguidos", description: "Racha de pareja de 3 dias" },
  { key: "streak7", name: "Una semana entera", description: "Racha de pareja de 7 dias" },
  { key: "streak30", name: "Un mes juntos aqui", description: "Racha de pareja de 30 dias" },
  { key: "firstMoment", name: "Primer recuerdo", description: "Vuestro primer momento guardado" },
  { key: "photos20", name: "Coleccionistas", description: "20 fotos en el album" },
  { key: "messages100", name: "Charlatanes", description: "100 mensajes entre los dos" },
  { key: "messages1000", name: "Novela epistolar", description: "1000 mensajes entre los dos" },
  { key: "firstDuel", name: "Primer duelo", description: "Vuestro primer duelo en la arcade" },
  { key: "duels10", name: "Rivales intimos", description: "10 dias de duelos jugados" },
  { key: "boxes7", name: "Curiosos", description: "7 cajas diarias abiertas" },
  { key: "voice1", name: "Tu voz", description: "Primera nota de voz enviada" }
];

export async function syncAchievements(coupleId: string, userId: string, memberIds: string[]) {
  const [{ streak }, momentCount, photoCount, messageCount, duelDays, boxCount, voiceCount, unlocked] =
    await Promise.all([
      getCoupleStreak(coupleId, memberIds),
      prisma.moment.count({ where: { coupleId } }),
      prisma.moment.count({ where: { coupleId, kind: "PHOTO" } }),
      prisma.message.count({ where: { coupleId } }),
      prisma.gameScore.groupBy({ by: ["dateKey"], where: { coupleId } }).then((r) => r.length),
      prisma.dailyBox.count({ where: { coupleId } }),
      prisma.message.count({ where: { coupleId, kind: "VOICE" } }),
      prisma.achievementUnlock.findMany({ where: { userId } })
    ]);

  const done = new Set(unlocked.map((u) => u.key));
  const earned: string[] = [];
  const check = (key: string, condition: boolean) => {
    if (condition && !done.has(key)) earned.push(key);
  };
  check("streak3", streak >= 3);
  check("streak7", streak >= 7);
  check("streak30", streak >= 30);
  check("firstMoment", momentCount >= 1);
  check("photos20", photoCount >= 20);
  check("messages100", messageCount >= 100);
  check("messages1000", messageCount >= 1000);
  check("firstDuel", duelDays >= 1);
  check("duels10", duelDays >= 10);
  check("boxes7", boxCount >= 7);
  check("voice1", voiceCount >= 1);

  if (earned.length > 0) {
    await prisma.achievementUnlock.createMany({
      data: earned.map((key) => ({ coupleId, userId, key })),
      skipDuplicates: true
    });
  }
  const all = await prisma.achievementUnlock.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" }
  });
  return { unlocked: all, fresh: earned };
}
