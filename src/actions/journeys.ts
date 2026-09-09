"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { coupleAction } from "@/lib/safe-action";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import { addPoints, POINTS } from "@/lib/engagement";
import { notifyPartner } from "@/lib/notify";
import { resolveJourneyStep } from "@/lib/journeys";

// Responder un paso de un viaje. Mismo motor de reciprocidad que los mazos
// (CardAnswer, respuesta a ciegas), con dos añadidos propios del viaje:
//  - progresión de PAREJA: el paso solo queda "completo" cuando ambos han
//    respondido; el server devuelve stepComplete para que el cliente abra el
//    siguiente paso solo entonces.
//  - notificación: al dar un paso avisamos a la pareja —te toca a ti, o ya
//    podéis avanzar— porque es lo que trae de vuelta al día siguiente.

const schema = z.object({
  cardId: z.string().max(60),
  answer: z.string().trim().min(1, "Escribe tu respuesta").max(600)
});

export const answerJourneyStepAction = coupleAction<
  [input: { cardId: string; answer: string }],
  { partnerAnswer: string | null; stepComplete: boolean }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const resolved = resolveJourneyStep(parsed.data.cardId);
  if (!resolved) return { ok: false, error: "Paso no valido" };

  const dateKey = dayKeyIn(user.timezone);
  const { start } = dayRangeUtc(dateKey, user.timezone);
  const [existing, cardsToday] = await Promise.all([
    prisma.cardAnswer.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: parsed.data.cardId } }
    }),
    // "carta" del día: mazos y viajes comparten cupo (integridad del libro
    // mayor: cada concepto puntua como maximo una vez al día)
    prisma.cardAnswer.count({ where: { userId: user.id, createdAt: { gte: start } } })
  ]);

  await prisma.cardAnswer.upsert({
    where: { userId_cardId: { userId: user.id, cardId: parsed.data.cardId } },
    update: { answer: parsed.data.answer },
    create: { coupleId, userId: user.id, cardId: parsed.data.cardId, answer: parsed.data.answer }
  });
  // marca actividad para la racha aunque no puntue; puntua solo la primera del día
  await addPoints(coupleId, user.id, !existing && cardsToday === 0 ? POINTS.card : 0, dateKey);

  const partner = partnerId
    ? await prisma.cardAnswer.findUnique({
        where: { userId_cardId: { userId: partnerId, cardId: parsed.data.cardId } }
      })
    : null;
  const stepComplete = !!partner;

  // solo avisamos cuando es un paso NUEVO (no al reeditar una respuesta ya dada)
  if (!existing && partnerId) {
    const url = `/viajes/${resolved.journey.key}`;
    const push = stepComplete
      ? {
          // tu pareja te esperaba: al responder tú, el paso se completa y avanza
          title: `${user.name} ha respondido en «${resolved.journey.title}»`,
          body: "Ya podéis abrir el siguiente paso de vuestro viaje.",
          url,
          tag: `near-viaje-${resolved.journey.key}`
        }
      : {
          // ahora le toca a ella/él: este es el gesto que trae de vuelta mañana
          title: `${user.name} ha dado un paso en «${resolved.journey.title}»`,
          body: "Te espera para poder abrirlo juntos.",
          url,
          tag: `near-viaje-${resolved.journey.key}`
        };
    notifyPartner(coupleId, partnerId, { type: "event", payload: { byId: user.id } }, push);
  }

  revalidatePath(`/viajes/${resolved.journey.key}`);
  revalidatePath("/viajes");
  // reciprocidad: solo revelo la suya si YO acabo de responder (siempre aquí)
  return { ok: true, data: { partnerAnswer: partner?.answer ?? null, stepComplete } };
});
