"use server";

import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { notifyPartner } from "@/lib/notify";
import { messageSchema } from "@/lib/validators";
import { addPoints, POINTS } from "@/lib/engagement";
import { dayKeyIn, dayRangeUtc } from "@/lib/dates";
import { coupleAction } from "@/lib/safe-action";
import { toChatMessage } from "@/lib/chat";
import type { ChatMessage } from "@/types";

export const sendMessageAction = coupleAction<
  [
    input: {
      channel?: "MAIN" | "DATE_ROOM";
      kind?: "TEXT" | "IMAGE" | "VOICE";
      body?: string;
      attachmentUrl?: string;
      durationSeconds?: number;
    }
  ],
  { message: ChatMessage }
>(async ({ user, coupleId, partnerId }, input) => {
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

  // primer mensaje del dia (local del usuario): cuenta para racha y suma puntos
  const dateKey = dayKeyIn(user.timezone);
  const { start } = dayRangeUtc(dateKey, user.timezone);
  const todayCount = await prisma.message.count({
    where: { senderId: user.id, createdAt: { gte: start } }
  });
  await addPoints(coupleId, user.id, todayCount <= 1 ? POINTS.firstMessageOfDay : 0, dateKey);

  const dto = toChatMessage(message);
  const preview =
    dto.kind === "IMAGE" ? "📷 Foto" : dto.kind === "VOICE" ? "🎤 Nota de voz" : dto.body ?? "";
  notifyPartner(
    coupleId,
    partnerId,
    { type: "message:new", payload: dto },
    {
      title: user.name,
      body: preview.slice(0, 90),
      url: dto.channel === "DATE_ROOM" ? "/date-room" : "/chat",
      tag: "chat" // una rafaga de mensajes colapsa en una sola notificacion
    }
  );
  return { ok: true, data: { message: dto } };
});

export const toggleReactionAction = coupleAction<
  [messageId: string, emoji: string],
  { messageId: string; reactions: ChatMessage["reactions"] }
>(async ({ user, coupleId }, messageId, emoji) => {
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
});

export const loadOlderMessagesAction = coupleAction<
  [input: { channel: "MAIN" | "DATE_ROOM"; beforeId: string }],
  { messages: ChatMessage[]; hasMore: boolean }
>(async ({ coupleId }, input) => {
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
});

export const markChatSeenAction = coupleAction(async ({ user }) => {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastChatSeenAt: new Date() }
  });
  return { ok: true };
});
