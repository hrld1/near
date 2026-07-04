"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { dayKeyIn } from "@/lib/dates";
import { gameByKey, compareScores } from "@/lib/games";
import { addPoints, POINTS } from "@/lib/engagement";
import type { ActionResult } from "@/types";

const scoreSchema = z.object({
  gameKey: z.string().min(1),
  score: z.number().finite()
});

export async function submitScoreAction(input: {
  gameKey: string;
  score: number;
}): Promise<ActionResult<{ best: number; attemptsLeft: number; beatPartner: boolean | null }>> {
  try {
    const { user, couple, coupleId } = await requireCoupleAction();
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

    const myScores = [...previous.map((p) => p.score), parsed.data.score];
    const best = def.lowerIsBetter ? Math.min(...myScores) : Math.max(...myScores);

    // comparar con la pareja (mejor marca de hoy)
    const partnerBestRow = await prisma.gameScore.findMany({
      where: { coupleId, gameKey: def.key, dateKey, userId: { not: user.id } }
    });
    let beatPartner: boolean | null = null;
    if (partnerBestRow.length > 0) {
      const partnerScores = partnerBestRow.map((p) => p.score);
      const partnerBest = def.lowerIsBetter
        ? Math.min(...partnerScores)
        : Math.max(...partnerScores);
      beatPartner = compareScores(def, best, partnerBest) < 0;
    }

    publish(coupleId, {
      type: "game:score",
      payload: { userId: user.id, gameKey: def.key, score: parsed.data.score }
    });
    revalidatePath("/play");
    return {
      ok: true,
      data: { best, attemptsLeft: def.maxAttemptsPerDay - previous.length - 1, beatPartner }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function claimMissionBonusAction(): Promise<ActionResult<{ points: number }>> {
  try {
    const { user, couple, coupleId } = await requireCoupleAction();
    const coupleDay = dayKeyIn(couple.timezone);
    const userDay = dayKeyIn(user.timezone);
    const { getDailyMissions } = await import("@/lib/engagement");
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
