"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { coupleAction } from "@/lib/safe-action";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import { addPoints, POINTS } from "@/lib/engagement";
import { resolveCard } from "@/lib/decks";

// Mazos de preguntas: guardas TU respuesta a una carta. Reciprocidad por carta:
// solo al responder puedes ver la de tu pareja, así que la acción la devuelve
// (si existe) justo después de guardar la tuya. Puntúa la primera carta del día.

const schema = z.object({
  cardId: z.string().max(40),
  answer: z.string().trim().min(1, "Escribe tu respuesta").max(600)
});

export const answerCardAction = coupleAction<
  [input: { cardId: string; answer: string }],
  { partnerAnswer: string | null }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!resolveCard(parsed.data.cardId)) return { ok: false, error: "Carta no valida" };

  const dateKey = dayKeyIn(user.timezone);
  const { start } = dayRangeUtc(dateKey, user.timezone);
  const [existing, answeredToday] = await Promise.all([
    prisma.cardAnswer.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: parsed.data.cardId } }
    }),
    prisma.cardAnswer.count({ where: { userId: user.id, createdAt: { gte: start } } })
  ]);

  await prisma.cardAnswer.upsert({
    where: { userId_cardId: { userId: user.id, cardId: parsed.data.cardId } },
    update: { answer: parsed.data.answer },
    create: { coupleId, userId: user.id, cardId: parsed.data.cardId, answer: parsed.data.answer }
  });
  // solo la primera carta NUEVA del día puntúa
  await addPoints(coupleId, user.id, !existing && answeredToday === 0 ? POINTS.card : 0, dateKey);

  const partner = partnerId
    ? await prisma.cardAnswer.findUnique({
        where: { userId_cardId: { userId: partnerId, cardId: parsed.data.cardId } }
      })
    : null;
  revalidatePath(`/cerca/${parsed.data.cardId.split(":")[0]}`);
  return { ok: true, data: { partnerAnswer: partner?.answer ?? null } };
});
