"use server";

import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { messageSchema } from "@/lib/validators";
import { addPoints, POINTS } from "@/lib/engagement";
import { todayKey } from "@/lib/utils";
import { toChatMessage } from "@/lib/chat";
import type { ActionResult, ChatMessage } from "@/types";

export async function sendMessageAction(input: {
  channel?: "MAIN" | "DATE_ROOM";
  kind?: "TEXT" | "IMAGE" | "VOICE";
  body?: string;
  attachmentUrl?: string;
  durationSeconds?: number;
}): Promise<ActionResult<{ message: ChatMessage }>> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const message = await prisma.message.create({
      data: {
        coupleId,
        senderId: user.id,
        channel: parsed.data.channel,
        kind: parsed.data.kind,
        body: parsed.data.body || null,
        attachmentUrl: parsed.data.attachmentUrl || null,
        durationSeconds: parsed.data.durationSeconds ?? null
      },
      include: { reactions: true }
    });

    // primer mensaje del dia: cuenta para racha y suma puntos
    const startOfDay = new Date(`${todayKey()}T00:00:00`);
    const todayCount = await prisma.message.count({
      where: { senderId: user.id, createdAt: { gte: startOfDay } }
    });
    await addPoints(coupleId, user.id, todayCount <= 1 ? POINTS.firstMessageOfDay : 0);

    const dto = toChatMessage(message);
    publish(coupleId, { type: "message:new", payload: dto });
    return { ok: true, data: { message: dto } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al enviar" };
  }
}

export async function toggleReactionAction(
  messageId: string,
  emoji: string
): Promise<ActionResult<{ messageId: string; reactions: ChatMessage["reactions"] }>> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    if (emoji.length === 0 || emoji.length > 8) {
      return { ok: false, error: "Reaccion no valida" };
    }
    const message = await prisma.message.findFirst({
      where: { id: messageId, coupleId }
    });
    if (!message) return { ok: false, error: "Mensaje no encontrado" };

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } }
    });
    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.create({ data: { messageId, userId: user.id, emoji } });
    }

    const reactions = await prisma.messageReaction.findMany({ where: { messageId } });
    const payload = {
      messageId,
      reactions: reactions.map((r) => ({ emoji: r.emoji, userId: r.userId }))
    };
    publish(coupleId, { type: "message:reaction", payload });
    return { ok: true, data: payload };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function loadOlderMessagesAction(input: {
  channel: "MAIN" | "DATE_ROOM";
  beforeId: string;
}): Promise<ActionResult<{ messages: ChatMessage[]; hasMore: boolean }>> {
  try {
    const { coupleId } = await requireCoupleAction();
    const anchor = await prisma.message.findFirst({
      where: { id: input.beforeId, coupleId }
    });
    if (!anchor) return { ok: false, error: "Mensaje ancla no encontrado" };
    const rows = await prisma.message.findMany({
      where: {
        coupleId,
        channel: input.channel,
        createdAt: { lt: anchor.createdAt }
      },
      orderBy: { createdAt: "desc" },
      take: 51,
      include: { reactions: true }
    });
    const hasMore = rows.length > 50;
    const page = rows.slice(0, 50).reverse().map(toChatMessage);
    return { ok: true, data: { messages: page, hasMore } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function markChatSeenAction(): Promise<ActionResult> {
  try {
    const { user } = await requireCoupleAction();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastChatSeenAt: new Date() }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
