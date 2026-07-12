"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";
import { planSchema } from "@/lib/citas";
import { dayRangeUtc } from "@/lib/dates";

// Acciones de los planes de cita: proponer (guarda el plan + evento de
// calendario con countdown + push), aceptar ("me apunto") y borrar.
// La IA solo PROPONE datos; persistir siempre pasa por aquí, revalidado
// con el mismo esquema Zod del itinerario.

function refresh() {
  revalidatePath("/citas");
  revalidatePath("/calendar");
  revalidatePath("/home");
}

export const proposeDatePlanAction = coupleAction<[input: unknown], { id: string }>(
  async ({ user, coupleId, partnerId }, input) => {
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "El plan no es válido" };
    const plan = parsed.data;

    // si el plan tiene fecha, crea el evento (countdown en Hoy y calendario)
    let eventId: string | null = null;
    let startsAt: Date | null = null;
    if (plan.date) {
      const time = plan.startTime ?? plan.steps[0]?.time ?? "20:00";
      const [h, min] = time.split(":").map(Number);
      // instante local del autor: medianoche local (UTC) + minutos del día
      startsAt = new Date(dayRangeUtc(plan.date, user.timezone).start.getTime() + (h * 60 + min) * 60_000);
      if (startsAt.getTime() > Date.now()) {
        const event = await prisma.calendarEvent.create({
          data: {
            coupleId,
            createdById: user.id,
            title: plan.title,
            description: plan.city ? `Cita en ${plan.city} · planeada con Near` : "Cita planeada con Near",
            kind: "DATE",
            startsAt,
            showCountdown: true
          }
        });
        eventId = event.id;
      }
    }

    const saved = await prisma.datePlan.create({
      data: {
        coupleId,
        authorId: user.id,
        mode: plan.mode,
        title: plan.title,
        city: plan.city ?? null,
        planDate: startsAt,
        budget: plan.budget ?? null,
        steps: plan.steps,
        status: "PROPUESTA",
        eventId
      }
    });

    notifyPartner(
      coupleId,
      partnerId,
      { type: "cita:update", payload: { byId: user.id } },
      {
        title: `${user.name} os ha planeado una cita 💘`,
        body: plan.title,
        url: "/citas",
        tag: "near-cita"
      }
    );
    refresh();
    return { ok: true, data: { id: saved.id } };
  }
);

export const acceptDatePlanAction = coupleAction<[id: string]>(
  async ({ user, coupleId, partnerId }, id) => {
    const plan = await prisma.datePlan.findFirst({
      where: { id, coupleId, status: "PROPUESTA", authorId: { not: user.id } }
    });
    if (!plan) return { ok: false, error: "Esta cita ya no está pendiente" };
    await prisma.datePlan.update({ where: { id }, data: { status: "ACEPTADA" } });
    notifyPartner(
      coupleId,
      partnerId,
      { type: "cita:update", payload: { byId: user.id } },
      {
        title: `${user.name} se apunta a la cita 💛`,
        body: plan.title,
        url: "/citas",
        tag: "near-cita"
      }
    );
    refresh();
    return { ok: true };
  }
);

export const deleteDatePlanAction = coupleAction<[id: string]>(
  async ({ user, coupleId }, id) => {
    const plan = await prisma.datePlan.findFirst({ where: { id, coupleId } });
    if (!plan) return { ok: false, error: "No encontrada" };
    await prisma.datePlan.delete({ where: { id } });
    if (plan.eventId) {
      await prisma.calendarEvent.deleteMany({ where: { id: plan.eventId, coupleId } });
    }
    notifyPartner(coupleId, null, { type: "cita:update", payload: { byId: user.id } });
    refresh();
    return { ok: true };
  }
);
