"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import { addPoints, POINTS } from "@/lib/engagement";

// Frasco de aprecio: mandas algo que admiras/agradeces de tu pareja. Se guarda,
// llega en vivo (y por push si está fuera) y suma puntos solo el primero del día.

const schema = z.object({ body: z.string().trim().min(1, "Escribe algo bonito").max(280) });

export const sendAppreciationAction = coupleAction<
  [input: { body: string }],
  { id: string; createdAt: string }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const dateKey = dayKeyIn(user.timezone);
  const { start } = dayRangeUtc(dateKey, user.timezone);
  const sentToday = await prisma.appreciation.count({
    where: { fromId: user.id, createdAt: { gte: start } }
  });
  const appr = await prisma.appreciation.create({
    data: { coupleId, fromId: user.id, body: parsed.data.body }
  });
  // solo el primer aprecio del día puntúa (como el nudge)
  await addPoints(coupleId, user.id, sentToday === 0 ? POINTS.appreciation : 0, dateKey);
  notifyPartner(
    coupleId,
    partnerId,
    { type: "appreciation:new", payload: { id: appr.id, fromId: user.id, fromName: user.name, body: appr.body } },
    { title: `${user.name} admira algo de ti 💗`, body: appr.body.slice(0, 120), url: "/cerca", tag: "near-appreciation" }
  );
  return { ok: true, data: { id: appr.id, createdAt: appr.createdAt.toISOString() } };
});
