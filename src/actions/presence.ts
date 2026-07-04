"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { notifyPartner } from "@/lib/notify";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import { moodSchema, noteSchema, promptAnswerSchema } from "@/lib/validators";
import { coupleAction, coupleFormAction } from "@/lib/safe-action";
import type { Presence } from "@prisma/client";
import { addPoints, POINTS, touchActivity } from "@/lib/engagement";

const PRESENCE_VALUES: Presence[] = ["NONE", "FREE", "BUSY", "SLEEPING", "STUDYING"];

export const setPresenceAction = coupleAction<[presence: string]>(
  async ({ user, coupleId }, presence) => {
    if (!PRESENCE_VALUES.includes(presence as Presence)) {
      return { ok: false, error: "Estado no valido" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { presence: presence as Presence, presenceUpdatedAt: new Date() }
    });
    await touchActivity(coupleId, user.id, dayKeyIn(user.timezone));
    publish(coupleId, { type: "presence", payload: { userId: user.id, presence } });
    revalidatePath("/home");
    return { ok: true };
  }
);

export const setMoodAction = coupleAction<[input: { mood: string; note?: string }]>(
  async ({ user, coupleId }, input) => {
    const parsed = moodSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const dateKey = dayKeyIn(user.timezone); // el mood es personal: tu dia
    const existing = await prisma.moodEntry.findUnique({
      where: { userId_dateKey: { userId: user.id, dateKey } }
    });
    await prisma.moodEntry.upsert({
      where: { userId_dateKey: { userId: user.id, dateKey } },
      update: { mood: parsed.data.mood, note: parsed.data.note || null },
      create: {
        coupleId,
        userId: user.id,
        mood: parsed.data.mood,
        note: parsed.data.note || null,
        dateKey
      }
    });
    // reeditar el mood no vuelve a puntuar
    await addPoints(coupleId, user.id, existing ? 0 : POINTS.mood, dateKey);
    publish(coupleId, { type: "mood", payload: { userId: user.id, mood: parsed.data.mood } });
    revalidatePath("/home");
    return { ok: true };
  }
);

export const sendNudgeAction = coupleAction(async ({ user, coupleId, partnerId }) => {
  const recent = await prisma.nudge.findFirst({
    where: { coupleId, fromId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 1000) } }
  });
  if (recent) return { ok: false, error: "Acabas de enviar uno, dale un momento" };
  const dateKey = dayKeyIn(user.timezone);
  const { start } = dayRangeUtc(dateKey, user.timezone);
  const sentToday = await prisma.nudge.count({
    where: { fromId: user.id, createdAt: { gte: start } }
  });
  await prisma.nudge.create({ data: { coupleId, fromId: user.id } });
  // solo el primer nudge del dia puntua (el cooldown limita el ritmo, no el total)
  await addPoints(coupleId, user.id, sentToday === 0 ? POINTS.nudge : 0, dateKey);
  notifyPartner(
    coupleId,
    partnerId,
    { type: "nudge", payload: { fromId: user.id, fromName: user.name } },
    { title: `${user.name} esta pensando en ti 💗`, url: "/home", tag: "nudge" }
  );
  return { ok: true };
});

export const saveNoteAction = coupleFormAction(async ({ user, coupleId }, formData) => {
  const parsed = noteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.note.upsert({
    where: { coupleId_authorId: { coupleId, authorId: user.id } },
    update: { body: parsed.data.body },
    create: { coupleId, authorId: user.id, body: parsed.data.body }
  });
  publish(coupleId, { type: "note", payload: { authorId: user.id } });
  revalidatePath("/home");
  return { success: "Nota guardada" };
});

export const answerPromptAction = coupleFormAction(async ({ user, couple, coupleId }, formData) => {
  const parsed = promptAnswerSchema.safeParse({
    promptId: formData.get("promptId"),
    answer: formData.get("answer")
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // la pregunta del dia es un ritual compartido: ambas respuestas se
  // emparejan bajo el dia de la PAREJA (si no, la revelacion se descuadra)
  const dateKey = dayKeyIn(couple.timezone);
  const existing = await prisma.promptAnswer.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey } }
  });
  await prisma.promptAnswer.upsert({
    where: { userId_dateKey: { userId: user.id, dateKey } },
    update: { answer: parsed.data.answer },
    create: {
      promptId: parsed.data.promptId,
      coupleId,
      userId: user.id,
      dateKey,
      answer: parsed.data.answer
    }
  });
  // reeditar la respuesta no vuelve a puntuar
  await addPoints(coupleId, user.id, existing ? 0 : POINTS.prompt, dayKeyIn(user.timezone));
  publish(coupleId, { type: "prompt", payload: { userId: user.id } });
  revalidatePath("/home");
  return { success: "Respuesta guardada" };
});

export const saveTimezoneAction = coupleAction<[timezone: string]>(
  async ({ user }, timezone) => {
    if (!/^[A-Za-z_/+-]{2,60}$/.test(timezone)) return { ok: false, error: "Zona no valida" };
    if (user.timezone !== timezone) {
      await prisma.user.update({ where: { id: user.id }, data: { timezone } });
    }
    return { ok: true };
  }
);
