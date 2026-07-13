"use client";

import { useState } from "react";
import { Check, MessageSquareHeart } from "lucide-react";
import { sendFeedbackAction } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

// "¿Qué le falta a Near?" — el canal para escuchar a las primeras parejas.
export function FeedbackForm() {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const res = await sendFeedbackAction({ body: text });
    if (res.ok) {
      setSent(true);
      setBody("");
      setTimeout(() => setSent(false), 4000);
    } else {
      setError(res.error);
    }
    setSending(false);
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <MessageSquareHeart className="h-4 w-4 text-rose" />
        ¿Qué echas de menos? ¿Qué te estorba? Near se construye escuchando.
      </p>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Me encantaría que Near…"
        className="mt-3"
      />
      <div className="mt-2 flex items-center justify-between">
        {sent ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Recibido. Gracias de corazón 💛
          </span>
        ) : (
          <span className="text-xs text-ink-soft">{error ?? ""}</span>
        )}
        <Button size="sm" onClick={submit} loading={sending} disabled={!body.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
