import { prisma } from "@/lib/db";
import {
  bestStreakInRange,
  duelsFromScores,
  evenSample,
  haversineKm,
  parsePeriod,
  type Period
} from "@/lib/libro";

// Agregación de "Vuestro libro": todas las lecturas del período en paralelo,
// los duelos resueltos en memoria (duelsFromScores) — nada de una query por
// día. Solo lecturas.

export type Libro = {
  period: Period;
  portada: {
    meName: string;
    partnerName: string;
    daysOfUs: number; // días desde que crearon su espacio
    km: number | null;
    cities: string | null;
  };
  momentos: {
    mosaic: { url: string; caption: string | null }[];
    photosTotal: number;
    momentsTotal: number;
    topMoment: { title: string | null; imageUrl: string | null; comments: number } | null;
  };
  palabras: {
    messages: number;
    voices: number;
    appreciations: number;
    aprecioDestacado: string | null;
    preguntas: number; // pregunta del día + cartas de los mazos
  };
  juego: {
    played: number;
    myWins: number;
    partnerWins: number;
    draws: number;
  };
  cuidaros: {
    pulseAvg: number | null; // 1..5
    repairs: number;
    letters: number;
    citas: number;
    citasAceptadas: number;
  };
  constancia: {
    best: number;
    totalComplete: number;
  };
};

type Member = {
  id: string;
  name: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function getLibro(
  couple: { id: string; timezone: string; createdAt: Date },
  me: Member,
  partner: Member | null,
  periodRaw: string | undefined
): Promise<Libro> {
  const period = parsePeriod(periodRaw, couple.timezone);
  const range = { gte: period.start, lt: period.end };
  const memberIds = partner ? [me.id, partner.id] : [me.id];

  const [
    photoRows,
    momentsTotal,
    topMomentRow,
    messages,
    voices,
    apprecioRows,
    promptAnswers,
    cardAnswers,
    scoreRows,
    pulses,
    repairs,
    letters,
    citasRows,
    activityRows
  ] = await Promise.all([
    prisma.dailyPhoto.findMany({
      where: { coupleId: couple.id, createdAt: range },
      orderBy: { createdAt: "asc" },
      select: { imageUrl: true, caption: true }
    }),
    prisma.moment.count({ where: { coupleId: couple.id, createdAt: range } }),
    prisma.moment.findFirst({
      where: { coupleId: couple.id, createdAt: range },
      orderBy: { comments: { _count: "desc" } },
      include: { _count: { select: { comments: true } } }
    }),
    prisma.message.count({ where: { coupleId: couple.id, createdAt: range } }),
    prisma.message.count({ where: { coupleId: couple.id, createdAt: range, kind: "VOICE" } }),
    prisma.appreciation.findMany({
      where: { coupleId: couple.id, createdAt: range },
      select: { body: true }
    }),
    prisma.promptAnswer.count({ where: { coupleId: couple.id, createdAt: range } }),
    prisma.cardAnswer.count({ where: { coupleId: couple.id, createdAt: range } }),
    prisma.gameScore.findMany({
      where: { coupleId: couple.id, dateKey: { gte: period.fromKey, lte: period.toKey } },
      select: { userId: true, gameKey: true, dateKey: true, score: true }
    }),
    prisma.weeklyPulse.findMany({
      where: { coupleId: couple.id, weekKey: { gte: period.fromKey, lte: period.toKey } },
      select: { value: true }
    }),
    prisma.repair.count({ where: { coupleId: couple.id, createdAt: range } }),
    prisma.letter.count({ where: { coupleId: couple.id, deliverAt: range } }),
    prisma.datePlan.findMany({
      where: { coupleId: couple.id, createdAt: range },
      select: { status: true }
    }),
    prisma.activityDay.findMany({
      where: { coupleId: couple.id, dateKey: { gte: period.fromKey, lte: period.toKey } },
      select: { userId: true, dateKey: true }
    })
  ]);

  const byDay = new Map<string, Set<string>>();
  for (const row of activityRows) {
    if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, new Set());
    byDay.get(row.dateKey)!.add(row.userId);
  }

  const duels = duelsFromScores(scoreRows, memberIds);
  const aprecioDestacado =
    apprecioRows.length > 0
      ? [...apprecioRows].sort((a, b) => b.body.length - a.body.length)[0].body.slice(0, 160)
      : null;

  const km =
    partner &&
    me.latitude !== null &&
    me.longitude !== null &&
    partner.latitude !== null &&
    partner.longitude !== null
      ? haversineKm(me.latitude, me.longitude, partner.latitude, partner.longitude)
      : null;

  return {
    period,
    portada: {
      meName: me.name,
      partnerName: partner?.name ?? "tu pareja",
      daysOfUs: Math.max(1, Math.floor((Date.now() - couple.createdAt.getTime()) / 86_400_000) + 1),
      km,
      cities: me.city && partner?.city ? `${me.city} ↔ ${partner.city}` : null
    },
    momentos: {
      mosaic: evenSample(photoRows, 9).map((p) => ({ url: p.imageUrl, caption: p.caption })),
      photosTotal: photoRows.length,
      momentsTotal,
      topMoment:
        topMomentRow && topMomentRow._count.comments > 0
          ? {
              title: topMomentRow.title,
              imageUrl: topMomentRow.imageUrl,
              comments: topMomentRow._count.comments
            }
          : null
    },
    palabras: {
      messages,
      voices,
      appreciations: apprecioRows.length,
      aprecioDestacado,
      preguntas: promptAnswers + cardAnswers
    },
    juego: {
      played: duels.played,
      myWins: duels.wonBy[me.id] ?? 0,
      partnerWins: partner ? duels.wonBy[partner.id] ?? 0 : 0,
      draws: duels.draws
    },
    cuidaros: {
      pulseAvg:
        pulses.length > 0
          ? Math.round((pulses.reduce((s, p) => s + p.value, 0) / pulses.length) * 10) / 10
          : null,
      repairs,
      letters,
      citas: citasRows.length,
      citasAceptadas: citasRows.filter((c) => c.status === "ACEPTADA").length
    },
    constancia: bestStreakInRange(byDay, memberIds, period.fromKey, period.toKey)
  };
}
