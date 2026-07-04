"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { dayKeyIn, shiftDayKey } from "@/lib/dates";
import { bestOf, compareScores, gameByKey } from "@/lib/games";
import {
  addPoints,
  DUEL_CLAIM_TYPE,
  getDailyMissions,
  getDuelResult,
  getWeeklyBonusStatus,
  POINTS,
  syncAchievements,
  WEEKLY_CLAIM_TYPE
} from "@/lib/engagement";
import { coupleAction } from "@/lib/safe-action";

const scoreSchema = z.object({
  gameKey: z.string().min(1),
  score: z.number().finite()
});

export const submitScoreAction = coupleAction<
  [input: { gameKey: string; score: number }],
  { best: number; attemptsLeft: number; beatPartner: boolean | null }
>(async ({ user, couple, coupleId }, input) => {
  const parsed = scoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Puntuacion no valida" };
  const def = gameByKey(parsed.data.gameKey);
  if (!def) return { ok: false, error: "Juego desconocido" };
  if (parsed.data.score < def.scoreBounds.min || parsed.data.score > def.scoreBounds.max) {
    return { ok: false, error: "Puntuacion no valida" };
  }

  // dia de la PAREJA: el duelo compara los scores de ambos bajo la misma clave
  const dateKey = dayKeyIn(couple.timezone);
  const previous = await prisma.gameScore.findMany({
    where: { userId: user.id, gameKey: def.key, dateKey }
  });
  if (previous.length >= def.maxAttemptsPerDay) {
    return { ok: false, error: `Sin intentos hoy (max ${def.maxAttemptsPerDay})` };
  }

  await prisma.gameScore.create({
    data: {
      coupleId,
      userId: user.id,
      gameKey: def.key,
      dateKey,
      score: parsed.data.score
    }
  });

  // puntos de temporada: participar (1a vez del dia en este juego) + mejorar
  if (previous.length === 0) {
    await addPoints(coupleId, user.id, POINTS.gamePlayed, dayKeyIn(user.timezone));
  }

  const best = bestOf(def, [...previous.map((p) => p.score), parsed.data.score])!;

  // comparar con la pareja (mejor marca de hoy)
  const partnerRows = await prisma.gameScore.findMany({
    where: { coupleId, gameKey: def.key, dateKey, userId: { not: user.id } }
  });
  const partnerBest = bestOf(def, partnerRows.map((p) => p.score));
  const beatPartner = partnerBest === null ? null : compareScores(def, best, partnerBest) < 0;

  publish(coupleId, {
    type: "game:score",
    payload: { userId: user.id, gameKey: def.key, score: parsed.data.score }
  });
  revalidatePath("/play");
  return {
    ok: true,
    data: { best, attemptsLeft: def.maxAttemptsPerDay - previous.length - 1, beatPartner }
  };
});

export const claimMissionBonusAction = coupleAction<[], { points: number }>(
  async ({ user, couple, coupleId }) => {
    const coupleDay = dayKeyIn(couple.timezone);
    const userDay = dayKeyIn(user.timezone);
    const { allDone, bonusClaimed } = await getDailyMissions(coupleId, user.id, {
      coupleDay,
      userDay,
      userTimezone: user.timezone
    });
    if (bonusClaimed) return { ok: false, error: "Bonus ya reclamado hoy" };
    if (!allDone) return { ok: false, error: "Aun te quedan misiones" };
    // el claim protege el set de misiones, que rota con el dia de la pareja
    await prisma.dailyClaim.create({
      data: { coupleId, userId: user.id, dateKey: coupleDay, type: "DAILY_MISSIONS" }
    });
    await addPoints(coupleId, user.id, POINTS.missionBonus, userDay);
    publish(coupleId, { type: "season", payload: { userId: user.id } });
    revalidatePath("/home");
    revalidatePath("/play");
    return { ok: true, data: { points: POINTS.missionBonus } };
  }
);

// Reclama la victoria del duelo de AYER (dia de pareja). El servidor
// re-verifica el resultado; el unique de DailyClaim impide el doble cobro.
export const claimDuelWinAction = coupleAction<[], { points: number }>(
  async ({ user, couple, coupleId }) => {
    const duelDay = shiftDayKey(dayKeyIn(couple.timezone), -1);
    const duel = await getDuelResult(coupleId, duelDay);
    if (duel.winnerId !== user.id) {
      return { ok: false, error: "El duelo de ayer no lo ganaste tu" };
    }
    const existing = await prisma.dailyClaim.findUnique({
      where: { userId_dateKey_type: { userId: user.id, dateKey: duelDay, type: DUEL_CLAIM_TYPE } }
    });
    if (existing) return { ok: false, error: "Ese duelo ya esta cobrado" };
    await prisma.dailyClaim.create({
      data: { coupleId, userId: user.id, dateKey: duelDay, type: DUEL_CLAIM_TYPE }
    });
    await addPoints(coupleId, user.id, POINTS.duelWon, dayKeyIn(user.timezone));
    publish(coupleId, { type: "season", payload: { userId: user.id } });
    revalidatePath("/play");
    return { ok: true, data: { points: POINTS.duelWon } };
  }
);

// Reclama el bonus de la semana pasada completa (7/7 dias de pareja).
export const claimWeeklyBonusAction = coupleAction<[], { points: number }>(
  async ({ user, couple, coupleId }) => {
    const status = await getWeeklyBonusStatus(
      coupleId,
      user.id,
      couple.members.map((m) => m.id),
      couple.timezone
    );
    if (status.claimed) return { ok: false, error: "Bonus semanal ya reclamado" };
    if (!status.lastWeekComplete) {
      return { ok: false, error: "La semana pasada no quedo completa" };
    }
    await prisma.dailyClaim.create({
      data: { coupleId, userId: user.id, dateKey: status.lastMonday, type: WEEKLY_CLAIM_TYPE }
    });
    await addPoints(coupleId, user.id, POINTS.weeklyBonus, dayKeyIn(user.timezone));
    publish(coupleId, { type: "season", payload: { userId: user.id } });
    revalidatePath("/home");
    revalidatePath("/play");
    return { ok: true, data: { points: POINTS.weeklyBonus } };
  }
);

// Recalcula logros bajo demanda (lo dispara el cliente al entrar en /play):
// asi el render del server component queda como lectura pura.
export const syncAchievementsAction = coupleAction<[], { fresh: string[] }>(
  async ({ user, couple, coupleId }) => {
    const result = await syncAchievements(
      coupleId,
      user.id,
      couple.members.map((m) => m.id),
      couple.timezone
    );
    return { ok: true, data: { fresh: result.fresh } };
  }
);
