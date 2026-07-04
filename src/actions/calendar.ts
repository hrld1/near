"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { coupleAction, coupleFormAction } from "@/lib/safe-action";
import { eventSchema } from "@/lib/validators";

export const createEventAction = coupleFormAction(async ({ user, coupleId }, formData) => {
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    kind: formData.get("kind"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    showCountdown: formData.get("showCountdown") === "on"
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Fecha no valida" };

  let endsAt: Date | null = null;
  if (parsed.data.endsAt) {
    endsAt = new Date(parsed.data.endsAt);
    if (Number.isNaN(endsAt.getTime())) return { error: "Hora de fin no valida" };
    if (endsAt < startsAt) return { error: "El fin no puede ser antes del inicio" };
  }

  await prisma.calendarEvent.create({
    data: {
      coupleId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      kind: parsed.data.kind,
      startsAt,
      endsAt,
      showCountdown: parsed.data.showCountdown
    }
  });
  publish(coupleId, { type: "event", payload: { byId: user.id } });
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { success: "Evento creado" };
});

export const deleteEventAction = coupleAction<[id: string]>(async ({ coupleId }, id) => {
  const event = await prisma.calendarEvent.findFirst({ where: { id, coupleId } });
  if (!event) return { ok: false, error: "No encontrado" };
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true };
});
