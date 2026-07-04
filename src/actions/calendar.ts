"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { eventSchema } from "@/lib/validators";
import type { ActionResult, FormState } from "@/types";

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = eventSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      kind: formData.get("kind"),
      startsAt: formData.get("startsAt"),
      showCountdown: formData.get("showCountdown") === "on"
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const startsAt = new Date(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime())) return { error: "Fecha no valida" };

    await prisma.calendarEvent.create({
      data: {
        coupleId,
        createdById: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        kind: parsed.data.kind,
        startsAt,
        showCountdown: parsed.data.showCountdown
      }
    });
    publish(coupleId, { type: "event", payload: { byId: user.id } });
    revalidatePath("/calendar");
    revalidatePath("/home");
    return { success: "Evento creado" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error" };
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  try {
    const { coupleId } = await requireCoupleAction();
    const event = await prisma.calendarEvent.findFirst({ where: { id, coupleId } });
    if (!event) return { ok: false, error: "No encontrado" };
    await prisma.calendarEvent.delete({ where: { id } });
    revalidatePath("/calendar");
    revalidatePath("/home");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
