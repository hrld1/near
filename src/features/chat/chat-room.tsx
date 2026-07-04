"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  Clock3,
  Heart,
  ImagePlus,
  MessagesSquare,
  Mic,
  SendHorizontal,
  SmilePlus,
  Square,
  X
} from "lucide-react";
import {
  loadOlderMessagesAction,
  markChatSeenAction,
  sendMessageAction,
  toggleReactionAction
} from "@/actions/messages";
import { sendNudgeAction } from "@/actions/presence";
import { uploadFile } from "@/lib/upload-client";
import { useCoupleStream } from "@/hooks/use-stream";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { timeShort, dayLabel } from "@/lib/format";
import type { ChatMessage, MemberInfo } from "@/types";

const REACTIONS = ["❤️", "😂", "😮", "🥺", "🔥"];
const GROUP_GAP_MS = 5 * 60 * 1000;

type Props = {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialMessages: ChatMessage[];
  channel: "MAIN" | "DATE_ROOM";
  compact?: boolean;
  initialHasMore?: boolean;
  trackSeen?: boolean;
};

export function ChatRoom({
  me,
  partner,
  initialMessages,
  channel,
  compact,
  initialHasMore,
  trackSeen
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSecondsRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!trackSeen) return;
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void markChatSeenAction();
    }
  }, [trackSeen, messages.length]);

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

  useCoupleStream((event) => {
    if (event.type === "message:new") {
      const message = event.payload as ChatMessage;
      if (message.channel !== channel) return;
      if (message.senderId === me.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    }
    if (event.type === "message:reaction") {
      const { messageId, reactions } = event.payload as {
        messageId: string;
        reactions: ChatMessage["reactions"];
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    }
  });

  function pushOptimistic(partial: Partial<ChatMessage>): string {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: me.id,
      channel,
      kind: "TEXT",
      body: null,
      attachmentUrl: null,
      durationSeconds: null,
      createdAt: new Date().toISOString(),
      reactions: [],
      ...partial
    };
    setMessages((prev) => [...prev, optimistic]);
    return tempId;
  }

  function deliver(tempId: string, input: Parameters<typeof sendMessageAction>[0]) {
    startTransition(async () => {
      const result = await sendMessageAction({ ...input, channel });
      if (result.ok && result.data) {
        const real = result.data.message;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(result.ok ? "Error al enviar" : result.error);
      }
    });
  }

  function sendText() {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const tempId = pushOptimistic({ kind: "TEXT", body });
    deliver(tempId, { kind: "TEXT", body });
  }

  async function sendImage(file: File) {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, file.name);
      const tempId = pushOptimistic({ kind: "IMAGE", attachmentUrl: url });
      deliver(tempId, { kind: "IMAGE", attachmentUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const seconds = recordSecondsRef.current;
        if (blob.size < 1000) return;
        setUploading(true);
        try {
          const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
          const url = await uploadFile(blob, `nota-de-voz.${ext}`);
          const tempId = pushOptimistic({
            kind: "VOICE",
            attachmentUrl: url,
            durationSeconds: seconds
          });
          deliver(tempId, { kind: "VOICE", attachmentUrl: url, durationSeconds: seconds });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al enviar la nota de voz");
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      setError("No se pudo acceder al microfono");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }

  function react(messageId: string, emoji: string) {
    setPickerFor(null);
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

  function sendQuickNudge() {
    setNudgeSent(true);
    startTransition(async () => {
      await sendNudgeAction();
    });
  }

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto px-4 pb-3 pt-4",
          compact && "px-3"
        )}
      >
        {hasMore && (
          <div className="pb-3 text-center">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-sand-deep bg-paper px-4 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-sand disabled:opacity-50"
            >
              {loadingOlder ? "Cargando..." : "Ver mensajes anteriores"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-faint">
              <MessagesSquare className="h-7 w-7 text-rose" />
            </span>
            <div>
              <p className="font-display text-lg text-ink">
                {channel === "DATE_ROOM" ? "La sala esta en silencio" : "Empieza la conversacion"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-ink-soft">
                {channel === "DATE_ROOM"
                  ? "Comentad lo que estais viendo, este chat es solo de la sala."
                  : "Todo lo que os digais aqui se queda entre vosotros dos."}
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

        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const own = message.senderId === me.id;
          const isTemp = message.id.startsWith("tmp-");
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
          const grouped: Record<string, number> = {};
          for (const r of message.reactions) grouped[r.emoji] = (grouped[r.emoji] ?? 0) + 1;
          const hasReactions = Object.keys(grouped).length > 0;

          return (
            <div key={message.id} className={cn(sameAsPrev ? "mt-0.5" : "mt-3.5")}>
              {showDay && (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-sand" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft/70">
                    {day}
                  </span>
                  <span className="h-px flex-1 bg-sand" />
                </div>
              )}
              <div className={cn("group flex items-end gap-2", own ? "justify-end" : "justify-start")}>
                {!own && !compact && (
                  <span className={cn("w-7 shrink-0", !lastOfGroup && "invisible")}>
                    {partner && <Avatar name={partner.name} tone={1} size="sm" className="h-7 w-7 text-[10px]" />}
                  </span>
                )}
                <div className={cn("relative max-w-[78%]", compact && "max-w-[90%]", hasReactions && "mb-3")}>
                  <div
                    className={cn(
                      "px-3.5 py-2 text-[15px] leading-relaxed shadow-card transition",
                      own
                        ? "bg-rose text-white"
                        : "border border-sand bg-paper text-ink",
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
                      <button onClick={() => setLightbox(message.attachmentUrl)} className="block">
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
                    {message.body && (
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    )}
                    {lastOfGroup && (
                      <span
                        className={cn(
                          "mt-0.5 flex items-center justify-end gap-1 text-[10px] tabular-nums",
                          own ? "text-white/70" : "text-ink-soft/70"
                        )}
                      >
                        {timeShort(message.createdAt)}
                        {own &&
                          (isTemp ? (
                            <Clock3 className="h-2.5 w-2.5" />
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                      </span>
                    )}
                  </div>

                  {hasReactions && (
                    <div
                      className={cn(
                        "absolute -bottom-3 flex gap-1",
                        own ? "right-2" : "left-2"
                      )}
                    >
                      {Object.entries(grouped).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => react(message.id, emoji)}
                          className="rounded-full border border-sand bg-paper px-1.5 py-0.5 text-xs shadow-card transition hover:scale-110"
                        >
                          {emoji}
                          {count > 1 && (
                            <span className="ml-0.5 text-[10px] text-ink-soft">{count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isTemp && (
                    <button
                      onClick={() => setPickerFor(pickerFor === message.id ? null : message.id)}
                      className={cn(
                        "absolute top-1 hidden rounded-full border border-sand bg-paper p-1 text-ink-soft shadow-card transition hover:text-rose group-hover:block",
                        own ? "-left-8" : "-right-8"
                      )}
                    >
                      <SmilePlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {pickerFor === message.id && (
                    <div
                      className={cn(
                        "absolute -top-11 z-10 flex animate-pop-in gap-1 rounded-full border border-sand bg-paper px-2 py-1.5 shadow-lift",
                        own ? "right-0" : "left-0"
                      )}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => react(message.id, emoji)}
                          className="rounded-full p-0.5 text-base transition hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-1 text-xs text-red-700 dark:text-red-400">
          {error}{" "}
          <button className="underline" onClick={() => setError(null)}>
            ok
          </button>
        </p>
      )}

      <div className={cn("px-3 pb-3 pt-1", compact && "px-2 pb-2")}>
        {recording ? (
          <div className="flex items-center gap-3 rounded-3xl border border-rose/30 bg-rose-faint px-4 py-2.5 shadow-card">
            <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Grabando · {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, "0")}
            </span>
            <button
              onClick={stopRecording}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-deep"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Enviar
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1 rounded-3xl border border-sand-deep bg-paper p-1.5 shadow-card focus-within:border-rose/50 focus-within:ring-2 focus-within:ring-rose/10">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void sendImage(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Enviar imagen"
              className="rounded-full p-2.5 text-ink-soft transition hover:bg-sand hover:text-ink disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={startRecording}
              disabled={uploading}
              title="Nota de voz"
              className="rounded-full p-2.5 text-ink-soft transition hover:bg-sand hover:text-ink disabled:opacity-50"
            >
              <Mic className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onInput={autoGrow}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              rows={1}
              placeholder={partner ? `Escribe a ${partner.name}...` : "Escribe un mensaje..."}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none"
            />
            <button
              onClick={sendText}
              disabled={!text.trim() || uploading}
              className={cn(
                "rounded-full p-2.5 text-white shadow-card transition",
                text.trim()
                  ? "bg-rose hover:bg-rose-deep"
                  : "bg-sand-deep text-ink-soft"
              )}
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Imagen"
            className="max-h-[90dvh] max-w-full animate-pop-in rounded-2xl object-contain"
          />
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
