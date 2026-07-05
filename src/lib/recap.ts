import { prisma } from "@/lib/db";
import { monthKeyIn, dayRangeUtc } from "@/lib/dates";
import { getCoupleStreak, getDuelResult } from "@/lib/engagement";

export type MonthlyRecap = {
  monthKey: string;
  monthLabel: string;
  messages: number;
  photos: number;
  moments: number;
  streak: number;
  duels: { won: number; lost: number; draw: number };
  topMoment: { title: string | null; imageUrl: string | null; comments: number } | null;
};

// "Vuestro mes en Near": números del mes en curso (calendario de la pareja),
// con los duelos vistos desde userId. Sin escrituras: solo lecturas agregadas.
export async function getMonthlyRecap(
  coupleId: string,
  userId: string,
  memberIds: string[],
  timezone: string
): Promise<MonthlyRecap> {
  const monthKey = monthKeyIn(timezone);
  const [y, m] = monthKey.split("-").map(Number);
  const start = dayRangeUtc(`${monthKey}-01`, timezone).start;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const end = dayRangeUtc(`${nextMonth}-01`, timezone).start;

  const [messages, photos, moments, playedDayRows, streakInfo, topMomentRow] = await Promise.all([
    prisma.message.count({ where: { coupleId, createdAt: { gte: start, lt: end } } }),
    prisma.dailyPhoto.count({ where: { coupleId, createdAt: { gte: start, lt: end } } }),
    prisma.moment.count({ where: { coupleId, createdAt: { gte: start, lt: end } } }),
    prisma.gameScore.findMany({
      where: { coupleId, dateKey: { startsWith: monthKey } },
      select: { dateKey: true },
      distinct: ["dateKey"]
    }),
    getCoupleStreak(coupleId, memberIds, timezone).catch(() => ({ streak: 0 })),
    prisma.moment.findFirst({
      where: { coupleId, createdAt: { gte: start, lt: end } },
      orderBy: { comments: { _count: "desc" } },
      include: { _count: { select: { comments: true } } }
    })
  ]);

  // duelos del mes desde el punto de vista de userId
  let won = 0;
  let lost = 0;
  let draw = 0;
  for (const { dateKey } of playedDayRows) {
    const result = await getDuelResult(coupleId, dateKey);
    if (!result.complete) continue;
    if (result.winnerId === null) draw++;
    else if (result.winnerId === userId) won++;
    else lost++;
  }

  const monthLabel = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(start);

  return {
    monthKey,
    monthLabel,
    messages,
    photos,
    moments,
    streak: streakInfo.streak,
    duels: { won, lost, draw },
    topMoment:
      topMomentRow && topMomentRow._count.comments > 0
        ? {
            title: topMomentRow.title,
            imageUrl: topMomentRow.imageUrl,
            comments: topMomentRow._count.comments
          }
        : null
  };
}
