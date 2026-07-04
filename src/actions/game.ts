"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { quizAnswerSchema } from "@/lib/validators";
import type { ActionResult } from "@/types";

export async function answerQuizAction(input: {
  questionId: number;
  selfIndex: number;
  guessIndex: number;
}): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
