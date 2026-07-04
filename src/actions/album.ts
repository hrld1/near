"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import type { ActionResult } from "@/types";

export async function toggleFavoriteAction(momentId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const moment = await prisma.moment.findFirst({ where: { id: momentId, coupleId } });
    if (!moment) return { ok: false, error: "No encontrado" };
    const existing = await prisma.momentFavorite.findUnique({
      where: { momentId_userId: { momentId, userId: user.id } }
    });
    if (existing) {
      await prisma.momentFavorite.delete({ where: { id: existing.id } });
    } else {
      await prisma.momentFavorite.create({ data: { momentId, userId: user.id } });
    }
    revalidatePath("/moments");
    return { ok: true, data: { favorited: !existing } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

const commentSchema = z.object({
  momentId: z.string().min(1),
  body: z.string().trim().min(1, "Escribe algo").max(500)
});

export async function addCommentAction(input: {
  momentId: string;
  body: string;
}): Promise<ActionResult<{ id: string; body: string; authorId: string; createdAt: string }>> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const moment = await prisma.moment.findFirst({
      where: { id: parsed.data.momentId, coupleId }
    });
    if (!moment) return { ok: false, error: "No encontrado" };
    const comment = await prisma.momentComment.create({
      data: { momentId: moment.id, authorId: user.id, body: parsed.data.body }
    });
    publish(coupleId, { type: "moment", payload: { authorId: user.id } });
    revalidatePath("/moments");
    return {
      ok: true,
      data: {
        id: comment.id,
        body: comment.body,
        authorId: comment.authorId,
        createdAt: comment.createdAt.toISOString()
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function deleteCommentAction(id: string): Promise<ActionResult> {
  try {
    const { user } = await requireCoupleAction();
    const comment = await prisma.momentComment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== user.id) return { ok: false, error: "No permitido" };
    await prisma.momentComment.delete({ where: { id } });
    revalidatePath("/moments");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function toggleFeaturedAction(momentId: string): Promise<ActionResult<{ featured: boolean }>> {
  try {
    const { coupleId } = await requireCoupleAction();
    const moment = await prisma.moment.findFirst({ where: { id: momentId, coupleId } });
    if (!moment) return { ok: false, error: "No encontrado" };
    const updated = await prisma.moment.update({
      where: { id: moment.id },
      data: { featured: !moment.featured }
    });
    revalidatePath("/moments");
    revalidatePath("/home");
    return { ok: true, data: { featured: updated.featured } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
