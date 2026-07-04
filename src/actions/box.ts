"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";
import { dayKeyIn } from "@/lib/dates";
import { pickBox } from "@/lib/box";
import { addPoints, POINTS } from "@/lib/engagement";
import { coupleAction } from "@/lib/safe-action";
import { agoLabel } from "@/lib/format";

export const openDailyBoxAction = coupleAction<
  [],
  { kind: string; content: string; openedByMe: boolean }
>(async ({ user, couple, coupleId, partnerId }) => {
  const dateKey = dayKeyIn(couple.timezone); // la caja es de la pareja: su dia

  const existing = await prisma.dailyBox.findUnique({
    where: { coupleId_dateKey: { coupleId, dateKey } }
  });
  if (existing) {
    return {
      ok: true,
      data: {
        kind: existing.kind,
        content: existing.content,
        openedByMe: existing.openedById === user.id
      }
    };
  }

  // flashback: un momento antiguo aleatorio del propio album
  const momentCount = await prisma.moment.count({ where: { coupleId } });
  let flashback: string | null = null;
  if (momentCount > 3) {
    const seedIndex =
      Math.abs(dateKey.split("-").reduce((a, b) => a + Number(b), 0) * 31) % momentCount;
    const moment = await prisma.moment.findFirst({
      where: { coupleId },
      orderBy: { happenedAt: "asc" },
      skip: seedIndex
    });
    if (moment) {
      const what = moment.title ?? moment.body?.slice(0, 80) ?? "una foto vuestra";
      flashback = `Flashback: "${what}" — lo guardasteis ${agoLabel(moment.happenedAt)}. Id a Momentos y revividlo un minuto.`;
    }
  }

  const seed = Math.abs(
    `${dateKey}:${coupleId}`.split("").reduce((a, c) => (a * 33 + c.charCodeAt(0)) | 0, 7)
  );
  const content = pickBox(seed, flashback);

  const box = await prisma.dailyBox.create({
    data: { coupleId, dateKey, openedById: user.id, kind: content.kind, content: content.text }
  });
  await addPoints(coupleId, user.id, POINTS.boxOpened, dayKeyIn(user.timezone));
  notifyPartner(
    coupleId,
    partnerId,
    { type: "box:opened", payload: { by: user.name, kind: box.kind, content: box.content } },
    { title: `${user.name} ha abierto la caja del dia 🎁`, url: "/home", tag: "box" }
  );
  revalidatePath("/home");
  return { ok: true, data: { kind: box.kind, content: box.content, openedByMe: true } };
});
