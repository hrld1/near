"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";
import { triviaById } from "@/lib/trivia";

// Duelo de ingenio: cada uno responde por su cuenta a preguntas con respuesta
// CORRECTA y el marcador dice quién acierta más. La respuesta se BLOQUEA al
// primer intento (no se puede cambiar tras ver si acertaste): así el marcador
// es honesto. Publica en el bus para que la pantalla de la pareja se actualice
// sola (mismo evento "quiz" que ya escucha esa zona).

const schema = z.object({
  questionId: z.string().max(20),
  choice: z.number().int().min(0).max(9)
});

export const answerTriviaAction = coupleAction<
  [input: { questionId: string; choice: number }],
  { correct: boolean; correctIndex: number; partnerChoice: number | null; locked: boolean }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Respuesta no valida" };
  const q = triviaById(parsed.data.questionId);
  if (!q) return { ok: false, error: "Pregunta no encontrada" };
  if (parsed.data.choice >= q.options.length) return { ok: false, error: "Opcion no valida" };

  // bloqueo al primer intento: si ya respondiste, vale la primera
  const existing = await prisma.triviaAnswer.findUnique({
    where: { userId_questionId: { userId: user.id, questionId: q.id } }
  });
  const choice = existing ? existing.choice : parsed.data.choice;
  if (!existing) {
    await prisma.triviaAnswer.create({
      data: { coupleId, userId: user.id, questionId: q.id, choice }
    });
    publish(coupleId, { type: "quiz", payload: { userId: user.id } });
  }

  const partner = partnerId
    ? await prisma.triviaAnswer.findUnique({
        where: { userId_questionId: { userId: partnerId, questionId: q.id } }
      })
    : null;
  revalidatePath("/play/ingenio");
  return {
    ok: true,
    data: {
      correct: choice === q.correct,
      correctIndex: q.correct,
      partnerChoice: partner?.choice ?? null,
      locked: !!existing
    }
  };
});
