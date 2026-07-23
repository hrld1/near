"use client";

import { Check, Clock3, Mic, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeShort } from "@/lib/format";
import type { ChatMessage } from "@/types";

const REACTIONS = ["❤️", "😂", "😮", "🥺", "🔥"];

// Burbuja de un mensaje: contenido (texto/imagen/voz), hora + estado de
// envio, reacciones y picker. La agrupacion la decide la lista.
export function MessageBubble({
  message,
  own,
  compact,
  lastOfGroup,
  pickerOpen,
  onTogglePicker,
  onReact,
  onOpenImage
}: {
  message: ChatMessage;
  own: boolean;
  compact?: boolean;
  lastOfGroup: boolean;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onReact: (emoji: string) => void;
  onOpenImage: (url: string) => void;
}) {
  const isTemp = message.id.startsWith("tmp-");
  const grouped: Record<string, number> = {};
  for (const r of message.reactions) grouped[r.emoji] = (grouped[r.emoji] ?? 0) + 1;
  const hasReactions = Object.keys(grouped).length > 0;

  return (
    <div className={cn("relative max-w-[78%]", compact && "max-w-[90%]", hasReactions && "mb-3")}>
      <div
        className={cn(
          "px-3.5 py-2 text-read leading-relaxed shadow-card transition",
          own ? "bg-rose text-white" : "border border-sand bg-paper text-ink",
          own
            ? lastOfGroup
              ? "rounded-2xl rounded-br-md"
              : "rounded-2xl"
            : lastOfGroup
              ? "rounded-2xl rounded-bl-md"
              : "rounded-2xl",
          isTemp && "opacity-60"
        )}
      >
        {message.kind === "IMAGE" && message.attachmentUrl && (
          <button onClick={() => onOpenImage(message.attachmentUrl!)} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachmentUrl}
              alt="Imagen"
              className="my-1 max-h-64 rounded-xl object-cover"
            />
          </button>
        )}
        {message.kind === "VOICE" && message.attachmentUrl && (
          <span className="flex items-center gap-2.5 py-1">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                own ? "bg-white/20" : "bg-rose-faint"
              )}
            >
              <Mic className={cn("h-4 w-4", own ? "text-white" : "text-rose")} />
            </span>
            <audio
              controls
              preload="metadata"
              src={message.attachmentUrl}
              className="h-9 max-w-[190px]"
            />
            {message.durationSeconds != null && (
              <span className={cn("text-xs tabular-nums", own ? "text-white/80" : "text-ink-soft")}>
                {message.durationSeconds}s
              </span>
            )}
          </span>
        )}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        {lastOfGroup && (
          <span
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1 text-2xs tabular-nums",
              own ? "text-white/70" : "text-ink-soft/70"
            )}
          >
            {timeShort(message.createdAt)}
            {own && (isTemp ? <Clock3 className="h-2.5 w-2.5" /> : <Check className="h-3 w-3" />)}
          </span>
        )}
      </div>

      {hasReactions && (
        <div className={cn("absolute -bottom-3 flex gap-1", own ? "right-2" : "left-2")}>
          {Object.entries(grouped).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="rounded-full border border-sand bg-paper px-1.5 py-0.5 text-xs shadow-card transition hover:scale-110"
            >
              {emoji}
              {count > 1 && <span className="ml-0.5 text-2xs text-ink-soft">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {!isTemp && (
        <button
          onClick={onTogglePicker}
          className={cn(
            "absolute top-1 hidden rounded-full border border-sand bg-paper p-1 text-ink-soft shadow-card transition hover:text-rose group-hover:block",
            own ? "-left-8" : "-right-8"
          )}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      )}
      {pickerOpen && (
        <div
          className={cn(
            "absolute -top-11 z-10 flex animate-pop-in gap-1 rounded-full border border-sand bg-paper px-2 py-1.5 shadow-lift",
            own ? "right-0" : "left-0"
          )}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="rounded-full p-0.5 text-base transition hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
