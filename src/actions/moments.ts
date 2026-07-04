"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { momentSchema } from "@/lib/validators";
import { addPoints, POINTS } from "@/lib/engagement";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import type { ActionResult } from "@/types";

export async function createMomentAction(input: {
  kind: "PHOTO" | "NOTE" | "MEMORY";
  title?: string;
  body?: string;
  imageUrl?: string;
  happenedAt?: string;
  tags?: string[];
}): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = momentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const happenedAt = parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : new Date();
    if (Number.isNaN(happenedAt.getTime())) return { ok: false, error: "Fecha no valida" };

    const dateKey = dayKeyIn(user.timezone);
    const { start } = dayRangeUtc(dateKey, user.timezone);
    const createdToday = await prisma.moment.count({
      where: { authorId: user.id, createdAt: { gte: start } }
    });
    await prisma.moment.create({
      data: {
        coupleId,
        authorId: user.id,
        kind: parsed.data.kind,
        title: parsed.data.title || null,
        body: parsed.data.body || null,
        imageUrl: parsed.data.imageUrl || null,
        tags: parsed.data.tags ?? [],
        happenedAt
      }
    });
    // solo el primer momento del dia puntua (subir 12 fotos no da 60 puntos)
    await addPoints(coupleId, user.id, createdToday === 0 ? POINTS.moment : 0, dateKey);
    publish(coupleId, { type: "moment", payload: { authorId: user.id } });
    revalidatePath("/moments");
    revalidatePath("/home");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function deleteMomentAction(id: string): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const moment = await prisma.moment.findFirst({ where: { id, coupleId } });
    if (!moment) return { ok: false, error: "No encontrado" };
    if (moment.authorId !== user.id) return { ok: false, error: "Solo puedes borrar tus momentos" };
    await prisma.moment.delete({ where: { id } });
    revalidatePath("/moments");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
