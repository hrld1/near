import type { Message, MessageReaction } from "@prisma/client";
import type { ChatMessage } from "@/types";

export function toChatMessage(m: Message & { reactions: MessageReaction[] }): ChatMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    channel: m.channel,
    kind: m.kind,
    body: m.body,
    attachmentUrl: m.attachmentUrl,
    durationSeconds: m.durationSeconds,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId }))
  };
}
