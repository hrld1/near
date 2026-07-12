"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";

// "Coincidir": marcas cuándo estás libre en los próximos días (instantes UTC).
// El solapamiento se calcula al pintar la vista; aquí solo se guardan/borran
// franjas y se propone una llamada concreta a partir de una coincidencia.

const DAY = 86_400_000;

const slotSchema = z.object({ start: z.string(), end: z.string() });

export const addFreeSlotAction = coupleAction<[input: { start: string; end: string }]>(
  async ({ user, coupleId }, input) => {
    const parsed = slotSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Franja no valida" };
    const start = new Date(parsed.data.start);
    const end = new Date(parsed.data.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, error: "Fecha no valida" };
    if (end <= start) return { ok: false, error: "El fin debe ser después del inicio" };
    const now = Date.now();
    if (end.getTime() < now) return { ok: false, error: "Esa franja ya ha pasado" };
    if (start.getTime() > now + 28 * DAY) return { ok: false, error: "Solo las próximas semanas" };
    if (end.getTime() - start.getTime() > 12 * 60 * 60 * 1000) return { ok: false, error: "Máximo 12 horas por franja" };

    await prisma.freeSlot.create({ data: { coupleId, userId: user.id, startsAt: start, endsAt: end } });
    publish(coupleId, { type: "free:changed", payload: { byId: user.id } });
    revalidatePath("/coincidir");
    revalidatePath("/home");
    return { ok: true };
  }
);

export const removeFreeSlotAction = coupleAction<[id: string]>(async ({ user, coupleId }, id) => {
  const slot = await prisma.freeSlot.findFirst({ where: { id, coupleId, userId: user.id } });
  if (!slot) return { ok: false, error: "No encontrada" };
  await prisma.freeSlot.delete({ where: { id } });
  publish(coupleId, { type: "free:changed", payload: { byId: user.id } });
  revalidatePath("/coincidir");
  revalidatePath("/home");
  return { ok: true };
});

const proposeSchema = z.object({ start: z.string(), end: z.string().optional(), title: z.string().max(80).optional() });

export const proposeCallAction = coupleAction<[input: { start: string; end?: string; title?: string }]>(
  async ({ user, coupleId, partnerId }, input) => {
    const parsed = proposeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Propuesta no valida" };
    const startsAt = new Date(parsed.data.start);
    if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Fecha no valida" };
    let endsAt: Date | null = null;
    if (parsed.data.end) {
      const e = new Date(parsed.data.end);
      if (!Number.isNaN(e.getTime()) && e > startsAt) endsAt = e;
    }
    await prisma.calendarEvent.create({
      data: {
        coupleId,
        createdById: user.id,
        title: (parsed.data.title || "Llamada").slice(0, 80),
        kind: "DATE",
        startsAt,
        endsAt,
        showCountdown: true
      }
    });
    notifyPartner(
      coupleId,
      partnerId,
      { type: "event", payload: { byId: user.id } },
      { title: `${user.name} propone una llamada`, body: "Mira la fecha en el calendario", url: "/calendar", tag: "near-call-plan" }
    );
    revalidatePath("/coincidir");
    revalidatePath("/calendar");
    revalidatePath("/home");
    return { ok: true };
  }
);
