"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import type { ActionResult } from "@/types";

// Feedback del producto: funciona con o sin pareja vinculada (por eso no usa
// coupleAction). Máximo 5 al día por usuario para evitar ruido.

const schema = z.object({ body: z.string().trim().min(3, "Cuéntanos un poco más").max(1000) });

export async function sendFeedbackAction(input: { body: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "No has iniciado sesión" };
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.feedback.count({
      where: { userId: user.id, createdAt: { gte: since } }
    });
    if (recent >= 5) return { ok: false, error: "Ya nos has contado mucho hoy — ¡gracias! Mañana más." };
    await prisma.feedback.create({
      data: { userId: user.id, coupleId: user.coupleId, body: parsed.data.body }
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar. Prueba otra vez." };
  }
}
