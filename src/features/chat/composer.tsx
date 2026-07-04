"use client";

import { useRef, useState } from "react";
import { ImagePlus, Mic, SendHorizontal, Square } from "lucide-react";
import { uploadFile } from "@/lib/upload-client";
import { useVoiceRecorder } from "@/features/chat/voice-recorder";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

// Composer del chat: texto (autogrow + Enter), imagen y nota de voz.
// Sube los adjuntos y delega el envio (optimista) en useChat.send.
export function Composer({
  partnerName,
  compact,
  send,
  onError
}: {
  partnerName: string | null;
  compact?: boolean;
  send: (partial: Partial<ChatMessage> & { kind: ChatMessage["kind"] }) => void;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recorder = useVoiceRecorder({
    onError,
    onFinish: (blob, seconds, ext) => {
      void (async () => {
        setUploading(true);
        try {
          const url = await uploadFile(blob, `nota-de-voz.${ext}`);
          send({ kind: "VOICE", attachmentUrl: url, durationSeconds: seconds });
        } catch (err) {
          onError(err instanceof Error ? err.message : "Error al enviar la nota de voz");
        } finally {
          setUploading(false);
        }
      })();
    }
  });

  function sendText() {
    const body = text.trim();
    if (!body) return;
    onError(null);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    send({ kind: "TEXT", body });
  }

  async function sendImage(file: File) {
    onError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, file.name);
      send({ kind: "IMAGE", attachmentUrl: url });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  return (
    <div className={cn("px-3 pb-3 pt-1", compact && "px-2 pb-2")}>
      {recorder.recording ? (
        <div className="flex items-center gap-3 rounded-3xl border border-rose/30 bg-rose-faint px-4 py-2.5 shadow-card">
          <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Grabando · {Math.floor(recorder.seconds / 60)}:
            {String(recorder.seconds % 60).padStart(2, "0")}
          </span>
          <button
            onClick={recorder.stop}
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
            onClick={recorder.start}
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
            placeholder={partnerName ? `Escribe a ${partnerName}...` : "Escribe un mensaje..."}
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <button
            onClick={sendText}
            disabled={!text.trim() || uploading}
            className={cn(
              "rounded-full p-2.5 text-white shadow-card transition",
              text.trim() ? "bg-rose hover:bg-rose-deep" : "bg-sand-deep text-ink-soft"
            )}
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
