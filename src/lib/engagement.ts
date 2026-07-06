import { prisma } from "@/lib/db";
import { dayKeyIn, dayRangeUtc, mondayOfWeek, monthKeyIn, shiftDayKey, type DayKey } from "@/lib/dates";
import { compareScores, gameOfDay } from "@/lib/games";
import {
  computeStreak,
  hashString,
  pickDailyMissions,
  seasonLevel,
  type Mission
} from "@/lib/engagement-core";

export { SEASON_LEVELS, seasonLevel, type Mission } from "@/lib/engagement-core";

// ---------------------------------------------------------------------------
// Motor de engagement de Near.
// ActivityDay es la unica fuente de verdad de puntos. Racha, misiones,
// temporada y logros se DERIVAN de datos reales (mensajes, moods, juegos...):
// no hay contadores paralelos que mantener sincronizados.
// Regla de integridad: cada concepto puntua COMO MAXIMO una vez por día
// (reeditar el mood o reenviar no vuelve a sumar). El dateKey lo decide el
// caller: día del usuario para lo personal, día de pareja para lo compartido.
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

// dateKey = día del usuario (su timezone): el libro mayor es personal.
export async function addPoints(coupleId: string, userId: string, points: number, dateKey: DayKey) {
  await prisma.activityDay.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    update: { points: { increment: points } },
    create: { coupleId, userId, dateKey, points }
  });
}

// Marca actividad sin puntos (cuenta para la racha)
export async function touchActivity(coupleId: string, userId: string, dateKey: DayKey) {
  await addPoints(coupleId, userId, 0, dateKey);
}

// Racha de PAREJA: días consecutivos en los que AMBOS estuvieron activos.
// Se recorre el calendario de la pareja (couple.timezone); cada miembro
// marca actividad en su propio día local, así que "día completo" = ambos
// activos en su día X. El calculo puro vive en engagement-core.
export async function getCoupleStreak(coupleId: string, memberIds: string[], coupleTimezone: string) {
  const today = dayKeyIn(coupleTimezone);
  const since = shiftDayKey(today, -120);
  const rows = await prisma.activityDay.findMany({
    where: { coupleId, dateKey: { gte: since } },
    select: { userId: true, dateKey: true }
  });
  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, new Set());
    byDay.get(row.dateKey)!.add(row.userId);
  }
  return computeStreak(byDay, memberIds, today);
}

// ---------------------------------------------------------------------------
// Temporada: mes natural en la zona de la pareja. Puntos por miembro y total.
// ---------------------------------------------------------------------------

export async function getSeason(coupleId: string, coupleTimezone: string) {
  const prefix = monthKeyIn(coupleTimezone);
  const rows = await prisma.activityDay.groupBy({
    by: ["userId"],
    where: { coupleId, dateKey: { startsWith: prefix } },
    _sum: { points: true }
  });
  const perUser = new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  const total = rows.reduce((acc, r) => acc + (r._sum.points ?? 0), 0);
  const daysLeft = (() => {
    const [y, m, d] = dayKeyIn(coupleTimezone).split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Math.max(0, lastDay - d);
  })();
  return { key: prefix, perUser, total, level: seasonLevel(total), daysLeft };
}

// ---------------------------------------------------------------------------
// Misiones: se calculan sobre datos reales del día. 3 diarias rotativas
// (deterministas por fecha+pareja) + bonus reclamable al completarlas.
// ---------------------------------------------------------------------------

// Las misiones rotan con el día de la PAREJA (coupleDay: misma lista para
// ambos). Cada item se comprueba contra la clave de su dato subyacente:
// mood en el día del usuario; pregunta/juegos/caja/claim en el de pareja;
// los contadores por createdAt usan el rango UTC del día local del usuario.
export async function getDailyMissions(
  coupleId: string,
  userId: string,
  keys: { coupleDay: DayKey; userDay: DayKey; userTimezone: string }
): Promise<{ missions: Mission[]; allDone: boolean; bonusClaimed: boolean }> {
  const { coupleDay, userDay, userTimezone } = keys;
  const range = dayRangeUtc(userDay, userTimezone);
  const [mood, prompt, moments, photoMsg, nudges, games, boxOpen, claim] = await Promise.all([
    prisma.moodEntry.findFirst({ where: { userId, dateKey: userDay } }),
    prisma.promptAnswer.findFirst({ where: { userId, dateKey: coupleDay } }),
    prisma.moment.count({
      where: { authorId: userId, createdAt: { gte: range.start, lt: range.end } }
    }),
    prisma.message.count({
      where: { senderId: userId, kind: "IMAGE", createdAt: { gte: range.start, lt: range.end } }
    }),
    prisma.nudge.count({
      where: { fromId: userId, createdAt: { gte: range.start, lt: range.end } }
    }),
    prisma.gameScore.count({ where: { userId, dateKey: coupleDay } }),
    prisma.dailyBox.findUnique({ where: { coupleId_dateKey: { coupleId, dateKey: coupleDay } } }),
    prisma.dailyClaim.findUnique({
      where: { userId_dateKey_type: { userId, dateKey: coupleDay, type: "DAILY_MISSIONS" } }
    })
  ]);

  const pool: Mission[] = [
    { id: "mood", label: "Haz tu mood check de hoy", points: 5, done: !!mood, href: "/home" },
    { id: "prompt", label: "Responde la pregunta del día", points: 5, done: !!prompt, href: "/home" },
    { id: "duel", label: "Juega el reto diario de la arcade", points: 10, done: games > 0, href: "/play" },
    { id: "moment", label: "Guarda un momento o una foto", points: 5, done: moments > 0, href: "/moments" },
    { id: "photo", label: "Envia una foto por el chat", points: 5, done: photoMsg > 0, href: "/chat" },
    { id: "nudge", label: "Manda un 'pensando en ti'", points: 2, done: nudges > 0, href: "/home" },
    { id: "box", label: "Abrid la caja del día", points: 5, done: !!boxOpen, href: "/home" }
  ];

  // 3 misiones deterministas por día y pareja (el reto diario siempre entra)
  const picked = pickDailyMissions(hashString(`${coupleDay}:${coupleId}`), pool);

  const allDone = picked.every((m) => m.done);
  return { missions: picked, allDone, bonusClaimed: !!claim };
}

// ---------------------------------------------------------------------------
// Duelo y bonus semanal: recompensas con liquidacion perezosa via claim
// (patron DailyClaim, sin cron y sin escrituras en GET). El servidor siempre
// re-verifica el resultado antes de pagar.
// ---------------------------------------------------------------------------

// Resultado del duelo de un día (de pareja): mejor marca de cada miembro en
// el reto de ese día. winnerId null = empate o duelo incompleto.
export async function getDuelResult(coupleId: string, dateKey: DayKey) {
  const def = gameOfDay(dateKey);
  const scores = await prisma.gameScore.findMany({
    where: { coupleId, gameKey: def.key, dateKey }
  });
  const bestByUser = new Map<string, number>();
  for (const row of scores) {
    const current = bestByUser.get(row.userId);
    const better =
      current === undefined || compareScores(def, row.score, current) < 0;
    if (better) bestByUser.set(row.userId, row.score);
  }
  let winnerId: string | null = null;
  if (bestByUser.size === 2) {
    const [[userA, bestA], [userB, bestB]] = [...bestByUser.entries()];
    const cmp = compareScores(def, bestA, bestB);
    winnerId = cmp === 0 ? null : cmp < 0 ? userA : userB;
  }
  return { def, dateKey, winnerId, bestByUser, complete: bestByUser.size === 2 };
}

export const DUEL_CLAIM_TYPE = "DUEL_WON";
export const WEEKLY_CLAIM_TYPE = "WEEKLY_BONUS";

// Bonus semanal: la SEMANA PASADA (ISO, en el calendario de la pareja) con
// los 7 días completos —ambos activos cada dia— da +40 a cada miembro.
// Se puede reclamar durante toda la semana siguiente.
export async function getWeeklyBonusStatus(
  coupleId: string,
  userId: string,
  memberIds: string[],
  coupleTimezone: string
) {
  const today = dayKeyIn(coupleTimezone);
  const thisMonday = mondayOfWeek(today);
  const lastMonday = shiftDayKey(thisMonday, -7);
  const lastWeekDays = Array.from({ length: 7 }, (_, i) => shiftDayKey(lastMonday, i));

  const [rows, claim] = await Promise.all([
    prisma.activityDay.findMany({
      where: { coupleId, dateKey: { gte: lastMonday, lt: shiftDayKey(thisMonday, 7) } },
      select: { userId: true, dateKey: true }
    }),
    prisma.dailyClaim.findUnique({
      where: { userId_dateKey_type: { userId, dateKey: lastMonday, type: WEEKLY_CLAIM_TYPE } }
    })
  ]);

  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, new Set());
    byDay.get(row.dateKey)!.add(row.userId);
  }
  const complete = (key: string) =>
    memberIds.length === 2 && memberIds.every((id) => byDay.get(key)?.has(id));

  const lastWeekComplete = lastWeekDays.every(complete);
  const thisWeekDaysComplete = Array.from({ length: 7 }, (_, i) =>
    shiftDayKey(thisMonday, i)
  ).filter((key) => key <= today && complete(key)).length;

  return {
    lastMonday,
    lastWeekComplete,
    claimed: !!claim,
    claimable: lastWeekComplete && !claim,
    thisWeekDaysComplete
  };
}

// ---------------------------------------------------------------------------
// Logros: computados sobre datos reales; el desbloqueo se persiste para
// poder ensenar "nuevo" y la fecha.
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: { key: string; name: string; description: string }[] = [
  { key: "streak3", name: "Tres seguidos", description: "Racha de pareja de 3 días" },
  { key: "streak7", name: "Una semana entera", description: "Racha de pareja de 7 días" },
  { key: "streak30", name: "Un mes juntos aquí", description: "Racha de pareja de 30 días" },
  { key: "firstMoment", name: "Primer recuerdo", description: "Vuestro primer momento guardado" },
  { key: "photos20", name: "Coleccionistas", description: "20 fotos en el album" },
  { key: "messages100", name: "Charlatanes", description: "100 mensajes entre los dos" },
  { key: "messages1000", name: "Novela epistolar", description: "1000 mensajes entre los dos" },
  { key: "firstDuel", name: "Primer duelo", description: "Vuestro primer duelo en la arcade" },
  { key: "duels10", name: "Rivales intimos", description: "10 días de duelos jugados" },
  { key: "boxes7", name: "Curiosos", description: "7 cajas diarias abiertas" },
  { key: "voice1", name: "Tu voz", description: "Primera nota de voz enviada" }
];

export async function syncAchievements(
  coupleId: string,
  userId: string,
  memberIds: string[],
  coupleTimezone: string
) {
  const [{ streak }, momentCount, photoCount, messageCount, duelDays, boxCount, voiceCount, unlocked] =
    await Promise.all([
      getCoupleStreak(coupleId, memberIds, coupleTimezone),
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
