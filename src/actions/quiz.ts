"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";
import { quizAnswerSchema } from "@/lib/validators";

export const answerQuizAction = coupleAction<
  [input: { questionId: number; selfIndex: number; guessIndex: number }]
>(async ({ user, coupleId }, input) => {
  const parsed = quizAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Respuesta no valida" };

  const question = await prisma.quizQuestion.findUnique({
    where: { id: parsed.data.questionId }
  });
  if (!question) return { ok: false, error: "Pregunta no encontrada" };
  const max = question.options.length - 1;
  if (parsed.data.selfIndex > max || parsed.data.guessIndex > max) {
    return { ok: false, error: "Opcion no valida" };
  }

  await prisma.quizAnswer.upsert({
    where: { questionId_userId: { questionId: question.id, userId: user.id } },
    update: { selfIndex: parsed.data.selfIndex, guessIndex: parsed.data.guessIndex },
    create: {
      questionId: question.id,
      coupleId,
      userId: user.id,
      selfIndex: parsed.data.selfIndex,
      guessIndex: parsed.data.guessIndex
    }
  });
  publish(coupleId, { type: "quiz", payload: { userId: user.id } });
  revalidatePath("/play");
  return { ok: true };
});
