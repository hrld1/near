"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";

// Herramientas para cerrar bien una discusión. Los gestos en caliente (respiro,
// tender la mano, aceptar) son efímeros: solo se retransmiten + push, no se
// guardan. La reflexión "después de la tormenta" sí se persiste, con
// reciprocidad por reflexión (ves la del otro solo cuando compartes la tuya).

const signalSchema = z.object({
  kind: z.enum(["pause", "reach", "accept"]),
  message: z.string().trim().max(140).optional()
});

export const repairSignalAction = coupleAction<
  [input: { kind: "pause" | "reach" | "accept"; message?: string }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = signalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Señal no valida" };
  const copy = {
    pause: { title: `${user.name} necesita un respiro`, body: "Volverá — no es que se vaya 🕊️" },
    reach: { title: `${user.name} tiende la mano`, body: parsed.data.message ?? "Quiere acercarse" },
    accept: { title: `${user.name} ha aceptado tu mano 💛`, body: "Estáis más cerca" }
  }[parsed.data.kind];
  notifyPartner(
    coupleId,
    partnerId,
    { type: "repair:signal", payload: { kind: parsed.data.kind, byId: user.id, byName: user.name, message: parsed.data.message } },
    { ...copy, url: "/reparar", tag: "near-repair" }
  );
  return { ok: true };
});

const entrySchema = z.object({
  repairId: z.string().optional(),
  feelings: z.array(z.string().max(30)).max(12),
  perspective: z.string().trim().min(1, "Cuéntalo con tus palabras").max(1000),
  need: z.string().trim().min(1, "¿Qué necesitas para estar mejor?").max(1000)
});

type Entry = { feelings: string[]; perspective: string; need: string };

export const submitRepairEntryAction = coupleAction<
  [input: { repairId?: string; feelings: string[]; perspective: string; need: string }],
  { repairId: string; partnerEntry: Entry | null }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  let repairId = parsed.data.repairId ?? null;
  if (repairId) {
    const exists = await prisma.repair.findFirst({ where: { id: repairId, coupleId }, select: { id: true } });
    if (!exists) repairId = null;
  }
  if (!repairId) {
    const created = await prisma.repair.create({ data: { coupleId, startedById: user.id } });
    repairId = created.id;
  }

  await prisma.repairEntry.upsert({
    where: { repairId_userId: { repairId, userId: user.id } },
    update: { feelings: parsed.data.feelings, perspective: parsed.data.perspective, need: parsed.data.need },
    create: {
      repairId,
      userId: user.id,
      feelings: parsed.data.feelings,
      perspective: parsed.data.perspective,
      need: parsed.data.need
    }
  });

  notifyPartner(
    coupleId,
    partnerId,
    { type: "repair:signal", payload: { kind: "aftermath", byId: user.id, byName: user.name } },
    { title: `${user.name} ha compartido cómo se sintió`, body: "Ábrelo en Reparar cuando estés listo/a", url: "/reparar", tag: "near-repair" }
  );

  const partner = partnerId
    ? await prisma.repairEntry.findUnique({ where: { repairId_userId: { repairId, userId: partnerId } } })
    : null;
  revalidatePath("/reparar");
  return {
    ok: true,
    data: {
      repairId,
      partnerEntry: partner
        ? { feelings: partner.feelings, perspective: partner.perspective, need: partner.need }
        : null
    }
  };
});
