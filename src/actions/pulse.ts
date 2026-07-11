"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { coupleAction } from "@/lib/safe-action";
import { dayKeyIn, mondayOfWeek } from "@/lib/dates";
import { addPoints, POINTS } from "@/lib/engagement";

// Pulso de la semana: cómo de cerca os sentís (1..5). Una marca por persona y
// semana (lunes de la semana de la pareja). Puntúa la primera vez de la semana.

const schema = z.object({
  value: z.number().int().min(1).max(5),
  note: z.string().trim().max(200).optional()
});

export const setPulseAction = coupleAction<[input: { value: number; note?: string }], { weekKey: string }>(
  async ({ user, couple, coupleId }, input) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Valor no valido" };
    const weekKey = mondayOfWeek(dayKeyIn(couple.timezone));
    const existing = await prisma.weeklyPulse.findUnique({
      where: { userId_weekKey: { userId: user.id, weekKey } }
    });
    await prisma.weeklyPulse.upsert({
      where: { userId_weekKey: { userId: user.id, weekKey } },
      update: { value: parsed.data.value, note: parsed.data.note || null },
      create: { coupleId, userId: user.id, weekKey, value: parsed.data.value, note: parsed.data.note || null }
    });
    // reeditarlo esta semana no vuelve a puntuar
    await addPoints(coupleId, user.id, existing ? 0 : POINTS.pulse, dayKeyIn(user.timezone));
    revalidatePath("/cerca");
    return { ok: true, data: { weekKey } };
  }
);
