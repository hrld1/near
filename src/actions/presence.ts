"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { todayKey } from "@/lib/utils";
import { moodSchema, noteSchema, promptAnswerSchema } from "@/lib/validators";
import type { ActionResult, FormState } from "@/types";
import type { Presence } from "@prisma/client";
import { addPoints, POINTS, touchActivity } from "@/lib/engagement";

const PRESENCE_VALUES: Presence[] = ["NONE", "FREE", "BUSY", "SLEEPING", "STUDYING"];

export async function setPresenceAction(presence: string): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    if (!PRESENCE_VALUES.includes(presence as Presence)) {
      return { ok: false, error: "Estado no valido" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { presence: presence as Presence, presenceUpdatedAt: new Date() }
    });
    await touchActivity(coupleId, user.id);
    publish(coupleId, { type: "presence", payload: { userId: user.id, presence } });
    revalidatePath("/home");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function setMoodAction(input: { mood: string; note?: string }): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = moodSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const dateKey = todayKey();
    await prisma.moodEntry.upsert({
      where: { userId_dateKey: { userId: user.id, dateKey } },
      update: { mood: parsed.data.mood, note: parsed.data.note || null },
      create: { coupleId, userId: user.id, mood: parsed.data.mood, note: parsed.data.note || null, dateKey }
    });
    await addPoints(coupleId, user.id, POINTS.mood);
    publish(coupleId, { type: "mood", payload: { userId: user.id, mood: parsed.data.mood } });
    revalidatePath("/home");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function sendNudgeAction(): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const recent = await prisma.nudge.findFirst({
      where: { coupleId, fromId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 1000) } }
    });
    if (recent) return { ok: false, error: "Acabas de enviar uno, dale un momento" };
    await prisma.nudge.create({ data: { coupleId, fromId: user.id } });
    await addPoints(coupleId, user.id, POINTS.nudge);
    publish(coupleId, { type: "nudge", payload: { fromId: user.id, fromName: user.name } });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function saveNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, coupleId } = await requireCoupleAction();
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error" };
  }
}

export async function answerPromptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = promptAnswerSchema.safeParse({
      promptId: formData.get("promptId"),
      answer: formData.get("answer")
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const dateKey = todayKey();
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
    await addPoints(coupleId, user.id, POINTS.prompt);
    publish(coupleId, { type: "prompt", payload: { userId: user.id } });
    revalidatePath("/home");
    return { success: "Respuesta guardada" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error" };
  }
}

export async function saveTimezoneAction(timezone: string): Promise<ActionResult> {
  try {
    const { user } = await requireCoupleAction();
    if (!/^[A-Za-z_/+-]{2,60}$/.test(timezone)) return { ok: false, error: "Zona no valida" };
    if (user.timezone !== timezone) {
      await prisma.user.update({ where: { id: user.id }, data: { timezone } });
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
