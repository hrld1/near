"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  loadOlderMessagesAction,
  markChatSeenAction,
  sendMessageAction,
  toggleReactionAction
} from "@/actions/messages";
import { useCoupleStream } from "@/hooks/use-stream";
import type { ChatMessage, MemberInfo } from "@/types";

// Estado y flujos del chat (mensajes, envio optimista, paginacion, stream,
// reacciones). La UI vive en chat-room.tsx y sus piezas.
export function useChat({
  me,
  channel,
  initialMessages,
  initialHasMore,
  trackSeen
}: {
  me: MemberInfo;
  channel: "MAIN" | "DATE_ROOM";
  initialMessages: ChatMessage[];
  initialHasMore?: boolean;
  trackSeen?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!trackSeen) return;
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void markChatSeenAction();
    }
  }, [trackSeen, messages.length]);

  useCoupleStream((event) => {
    if (event.type === "message:new") {
      const message = event.payload;
      if (message.channel !== channel) return;
      if (message.senderId === me.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    }
    if (event.type === "message:reaction") {
      const { messageId, reactions } = event.payload;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    }
  });

  async function loadOlder() {
    const first = messages.find((m) => !m.id.startsWith("tmp-"));
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const previousHeight = listRef.current?.scrollHeight ?? 0;
    const result = await loadOlderMessagesAction({ channel, beforeId: first.id });
    if (result.ok && result.data) {
      const { messages: older, hasMore: more } = result.data;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight - previousHeight;
        }
      });
    }
    setLoadingOlder(false);
  }

  // Envio optimista: pinta el mensaje ya y lo sustituye (o retira) al confirmar.
  function send(partial: Partial<ChatMessage> & { kind: ChatMessage["kind"] }) {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: me.id,
      channel,
      body: null,
      attachmentUrl: null,
      durationSeconds: null,
      createdAt: new Date().toISOString(),
      reactions: [],
      ...partial
    };
    setMessages((prev) => [...prev, optimistic]);
    startTransition(async () => {
      const result = await sendMessageAction({
        channel,
        kind: partial.kind,
        body: partial.body ?? undefined,
        attachmentUrl: partial.attachmentUrl ?? undefined,
        durationSeconds: partial.durationSeconds ?? undefined
      });
      if (result.ok && result.data) {
        const real = result.data.message;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(result.ok ? "Error al enviar" : result.error);
      }
    });
  }

  // Reaccion con eco local inmediato; el resultado del servidor reconcilia.
  function react(messageId: string, emoji: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const mine = m.reactions.some((r) => r.userId === me.id && r.emoji === emoji);
        return {
          ...m,
          reactions: mine
            ? m.reactions.filter((r) => !(r.userId === me.id && r.emoji === emoji))
            : [...m.reactions, { emoji, userId: me.id }]
        };
      })
    );
    startTransition(async () => {
      const result = await toggleReactionAction(messageId, emoji);
      if (result.ok && result.data) {
        const { messageId: id, reactions } = result.data;
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, reactions } : m)));
      }
    });
  }

  return { messages, error, setError, hasMore, loadingOlder, listRef, bottomRef, loadOlder, send, react };
}
