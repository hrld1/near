"use client";

import { useState, useTransition } from "react";
import { Heart, MessagesSquare } from "lucide-react";
import { sendNudgeAction } from "@/actions/presence";
import { Avatar } from "@/components/ui/avatar";
import { useChat } from "@/features/chat/use-chat";
import { Composer } from "@/features/chat/composer";
import { MessageBubble } from "@/features/chat/message-bubble";
import { ImageLightbox } from "@/features/chat/image-lightbox";
import { cn } from "@/lib/utils";
import { dayLabel } from "@/lib/format";
import type { ChatMessage, MemberInfo } from "@/types";

const GROUP_GAP_MS = 5 * 60 * 1000;

type Props = {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialMessages: ChatMessage[];
  channel: "MAIN" | "DATE_ROOM";
  compact?: boolean;
  initialHasMore?: boolean;
  trackSeen?: boolean;
  initialPartnerSeenAt?: string | null;
};

// Orquesta el chat: lista con agrupacion por autor/tiempo, estado vacio,
// composer y lightbox. La logica de datos vive en useChat.
export function ChatRoom({
  me,
  partner,
  initialMessages,
  channel,
  compact,
  initialHasMore,
  trackSeen,
  initialPartnerSeenAt
}: Props) {
  const chat = useChat({
    me,
    channel,
    initialMessages,
    initialHasMore,
    trackSeen,
    initialPartnerSeenAt
  });

  // "Visto" bajo mi último mensaje ya confirmado, si la pareja lo abrio después
  const lastOwn = [...chat.messages]
    .reverse()
    .find((m) => m.senderId === me.id && !m.id.startsWith("tmp-"));
  const lastOwnSeen =
    !!lastOwn &&
    !!chat.partnerSeenAt &&
    new Date(chat.partnerSeenAt).getTime() >= new Date(lastOwn.createdAt).getTime();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [, startTransition] = useTransition();

  function sendQuickNudge() {
    setNudgeSent(true);
    startTransition(async () => {
      await sendNudgeAction();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={chat.listRef}
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto px-4 pb-3 pt-4",
          compact && "px-3"
        )}
      >
        {chat.hasMore && (
          <div className="pb-3 text-center">
            <button
              onClick={chat.loadOlder}
              disabled={chat.loadingOlder}
              className="rounded-full border border-sand-deep bg-paper px-4 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-sand disabled:opacity-50"
            >
              {chat.loadingOlder ? "Cargando..." : "Ver mensajes anteriores"}
            </button>
          </div>
        )}

        {chat.messages.length === 0 && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-faint">
              <MessagesSquare className="h-7 w-7 text-rose" />
            </span>
            <div>
              <p className="font-display text-lg text-ink">
                {channel === "DATE_ROOM" ? "La sala está en silencio" : "Empieza la conversación"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-ink-soft">
                {channel === "DATE_ROOM"
                  ? "Comentad lo que estáis viendo, este chat es solo de la sala."
                  : "Todo lo que os digáis aquí se queda entre vosotros dos."}
              </p>
            </div>
            {channel === "MAIN" && partner && (
              <button
                onClick={sendQuickNudge}
                disabled={nudgeSent}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  nudgeSent
                    ? "border-rose/30 bg-rose-faint text-rose-deep"
                    : "border-sand-deep bg-paper text-ink hover:border-rose/40 hover:text-rose-deep"
                )}
              >
                <Heart className={cn("h-4 w-4", nudgeSent && "fill-rose text-rose")} />
                {nudgeSent ? `${partner.name} lo sabra en un segundo` : "Romper el hielo con un latido"}
              </button>
            )}
          </div>
        )}

        {chat.messages.map((message, index) => {
          const prev = chat.messages[index - 1];
          const next = chat.messages[index + 1];
          const own = message.senderId === me.id;
          const day = dayLabel(message.createdAt);
          const showDay = !prev || dayLabel(prev.createdAt) !== day;
          const sameAsPrev =
            !showDay &&
            prev &&
            prev.senderId === message.senderId &&
            new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() <
              GROUP_GAP_MS;
          const sameAsNext =
            next &&
            next.senderId === message.senderId &&
            dayLabel(next.createdAt) === day &&
            new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() <
              GROUP_GAP_MS;
          const lastOfGroup = !sameAsNext;

          return (
            <div key={message.id} className={cn(sameAsPrev ? "mt-0.5" : "mt-3.5")}>
              {showDay && (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-sand" />
                  <span className="text-2xs font-semibold uppercase tracking-widest text-ink-soft/70">
                    {day}
                  </span>
                  <span className="h-px flex-1 bg-sand" />
                </div>
              )}
              <div className={cn("group flex items-end gap-2", own ? "justify-end" : "justify-start")}>
                {!own && !compact && (
                  <span className={cn("w-7 shrink-0", !lastOfGroup && "invisible")}>
                    {partner && (
                      <Avatar name={partner.name} tone={1} size="sm" className="h-7 w-7 text-2xs" />
                    )}
                  </span>
                )}
                <MessageBubble
                  message={message}
                  own={own}
                  compact={compact}
                  lastOfGroup={lastOfGroup}
                  pickerOpen={pickerFor === message.id}
                  onTogglePicker={() =>
                    setPickerFor(pickerFor === message.id ? null : message.id)
                  }
                  onReact={(emoji) => {
                    setPickerFor(null);
                    chat.react(message.id, emoji);
                  }}
                  onOpenImage={setLightbox}
                />
              </div>
              {own && message.id === lastOwn?.id && lastOwnSeen && (
                <p className="mt-1 pr-1 text-right text-2xs font-medium text-ink-soft">
                  Visto
                </p>
              )}
            </div>
          );
        })}

        {chat.partnerTyping && partner && (
          <div className="mt-3.5 flex items-end gap-2">
            {!compact && (
              <span className="w-7 shrink-0">
                <Avatar name={partner.name} tone={1} size="sm" className="h-7 w-7 text-2xs" />
              </span>
            )}
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-sand px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-ink-soft/60 motion-safe:animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chat.bottomRef} />
      </div>

      {chat.error && (
        <p className="px-4 pb-1 text-xs text-red-700 dark:text-red-400">
          {chat.error}{" "}
          <button className="underline" onClick={() => chat.setError(null)}>
            ok
          </button>
        </p>
      )}

      <Composer
        partnerName={partner?.name ?? null}
        compact={compact}
        send={chat.send}
        onError={chat.setError}
        onTyping={chat.notifyTyping}
      />

      {lightbox && <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
