"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dayKeyIn, dayRangeUtc, shiftDayKey } from "@/lib/dates";
import { coupleAction } from "@/lib/safe-action";

// Cartas lentas: se escriben hoy y se entregan más tarde. SLOW llega mañana a
// las 08:00 en la zona del receptor; CAPSULE en una fecha elegida (cápsula del
// tiempo). La espera es parte del regalo: es el único mensaje no instantáneo.
const letterSchema = z.object({
  body: z.string().trim().min(1, "Escribe algo").max(4000),
  kind: z.enum(["SLOW", "CAPSULE"]).optional(),
  deliverAt: z.string().optional() // ISO; solo para CAPSULE
});

export const writeLetterAction = coupleAction<
  [input: { body: string; kind?: "SLOW" | "CAPSULE"; deliverAt?: string }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = letterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!partnerId) return { ok: false, error: "Aún no hay pareja a quien escribir" };
  const kind = parsed.data.kind === "CAPSULE" ? "CAPSULE" : "SLOW";

  let deliverAt: Date;
  if (kind === "CAPSULE") {
    if (!parsed.data.deliverAt) return { ok: false, error: "Elige una fecha de entrega" };
    deliverAt = new Date(parsed.data.deliverAt);
    // al menos una hora en el futuro, y no más de 10 años
    if (Number.isNaN(deliverAt.getTime()) || deliverAt.getTime() < Date.now() + 3_600_000) {
      return { ok: false, error: "La fecha debe ser futura" };
    }
    if (deliverAt.getTime() > Date.now() + 10 * 365 * 86_400_000) {
      return { ok: false, error: "Demasiado lejos en el tiempo" };
    }
  } else {
    // mañana a las 08:00 en la zona horaria del receptor
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { timezone: true }
    });
    const tz = partner?.timezone ?? user.timezone;
    const tomorrow = shiftDayKey(dayKeyIn(tz), 1);
    deliverAt = new Date(dayRangeUtc(tomorrow, tz).start.getTime() + 8 * 3_600_000);
  }

  await prisma.letter.create({
    data: { coupleId, authorId: user.id, kind, body: parsed.data.body, deliverAt }
  });
  revalidatePath("/letters");
  return { ok: true };
});

// El receptor abre una carta ya entregada: se marca la lectura.
export const openLetterAction = coupleAction<[id: string], { body: string }>(
  async ({ user, coupleId }, id) => {
    const letter = await prisma.letter.findFirst({
      where: { id, coupleId, authorId: { not: user.id } }
    });
    if (!letter) return { ok: false, error: "No encontrada" };
    if (letter.deliverAt.getTime() > Date.now()) return { ok: false, error: "Aún no ha llegado" };
    if (!letter.openedAt) {
      await prisma.letter.update({ where: { id }, data: { openedAt: new Date() } });
      revalidatePath("/letters");
    }
    return { ok: true, data: { body: letter.body } };
  }
);
