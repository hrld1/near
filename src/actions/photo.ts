"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";
import { dayKeyIn } from "@/lib/dates";
import { coupleAction } from "@/lib/safe-action";

// Foto del día estilo Locket: una por persona y día (día local del autor).
// Reemplaza la de hoy si ya había una. Llega al otro como hero de su home y,
// si tiene la app cerrada, como push con el pie de foto.
const photoSchema = z.object({
  imageUrl: z.string().startsWith("/api/files/").max(1000),
  caption: z.string().trim().max(140).optional()
});

export const setDailyPhotoAction = coupleAction<
  [input: { imageUrl: string; caption?: string }],
  { imageUrl: string; caption: string | null }
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const dateKey = dayKeyIn(user.timezone);
  const caption = parsed.data.caption || null;

  await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId: user.id, dateKey } },
    update: { imageUrl: parsed.data.imageUrl, caption },
    create: { coupleId, userId: user.id, dateKey, imageUrl: parsed.data.imageUrl, caption }
  });

  notifyPartner(
    coupleId,
    partnerId,
    { type: "photo:new", payload: { userId: user.id, imageUrl: parsed.data.imageUrl, caption } },
    {
      title: `${user.name} te ha mandado su día 📸`,
      body: caption ?? undefined,
      url: "/home",
      tag: "near-photo"
    }
  );
  revalidatePath("/home");
  return { ok: true, data: { imageUrl: parsed.data.imageUrl, caption } };
});
