"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Hourglass, Lock, Mail, MailOpen, Send } from "lucide-react";
import { openLetterAction, writeLetterAction } from "@/actions/letters";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type LetterDto = {
  id: string;
  mine: boolean;
  kind: "SLOW" | "CAPSULE";
  deliverAt: string;
  delivered: boolean;
  opened: boolean;
  body: string | null;
  createdAt: string;
};

function whenLabel(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function LettersView({
  partnerName,
  initialLetters
}: {
  partnerName: string;
  initialLetters: LetterDto[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"SLOW" | "CAPSULE">("SLOW");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // cuando llega una carta para mí, refresco para revelarla
  useCoupleStream((event) => {
    if (event.type !== "letter:delivered") return;
    sfx.success();
    router.refresh();
  });

  function submit() {
    setError(null);
    const text = body.trim();
    if (!text) return;
    const deliverAt =
      kind === "CAPSULE" && when ? new Date(when).toISOString() : undefined;
    if (kind === "CAPSULE" && !deliverAt) {
      setError("Elige cuándo se entrega");
      return;
    }
    startTransition(async () => {
      const result = await writeLetterAction({ body: text, kind, deliverAt });
      if (result.ok) {
        setBody("");
        setWhen("");
        setKind("SLOW");
        sfx.success();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function reveal(id: string) {
    setRevealed((prev) => new Set(prev).add(id));
    void openLetterAction(id);
  }

  return (
    <div className="space-y-6">
      {/* escribir */}
      <div className="rounded-2xl border border-sand bg-paper p-4 shadow-card">
        <div className="mb-3 flex gap-1 rounded-full bg-sand p-1">
          <button
            onClick={() => setKind("SLOW")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition",
              kind === "SLOW" ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <Hourglass className="h-3.5 w-3.5" /> Llega mañana
          </button>
          <button
            onClick={() => setKind("CAPSULE")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition",
              kind === "CAPSULE" ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <Clock className="h-3.5 w-3.5" /> Cápsula del tiempo
          </button>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder={`Escribe a ${partnerName}…`}
          className="w-full resize-none rounded-xl border border-sand-deep bg-cream/40 px-3 py-2.5 text-read leading-relaxed text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none focus:ring-2 focus:ring-rose/10"
        />

        {kind === "CAPSULE" && (
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-2 w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink focus:border-rose/50 focus:outline-none"
          />
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {kind === "SLOW"
              ? `Llegará mañana por la mañana, hora de ${partnerName}.`
              : "Se abrirá el día que elijas."}
          </p>
          <button
            onClick={submit}
            disabled={pending || !body.trim()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-rose px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Enviar
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {/* buzón */}
      {initialLetters.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          Aún no hay cartas. Escribe la primera arriba: llegará mañana a las 08:00, su hora
          — o elige una fecha y será una cápsula del tiempo.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialLetters.map((l) => (
            <LetterCard
              key={l.id}
              letter={l}
              partnerName={partnerName}
              revealed={revealed.has(l.id)}
              onReveal={() => reveal(l.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LetterCard({
  letter,
  partnerName,
  revealed,
  onReveal
}: {
  letter: LetterDto;
  partnerName: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  const capsule = letter.kind === "CAPSULE";

  // carta recibida aún en camino: cerrada
  if (!letter.mine && !letter.delivered) {
    return (
      <li className="flex items-center gap-3 rounded-2xl border border-dashed border-sand-deep bg-paper/60 px-4 py-3.5">
        <Lock className="h-5 w-5 shrink-0 text-ink-soft" />
        <div>
          <p className="text-sm font-medium text-ink">
            {capsule ? "Una cápsula" : "Una carta"} de {partnerName} en camino
          </p>
          <p className="text-xs text-ink-soft">Llega el {whenLabel(letter.deliverAt)}</p>
        </div>
      </li>
    );
  }

  // carta recibida y entregada: abrir / leída
  if (!letter.mine) {
    const open = revealed || letter.opened;
    if (!open) {
      return (
        <li>
          <button
            onClick={onReveal}
            className="flex w-full items-center gap-3 rounded-2xl border border-rose/30 bg-rose-faint px-4 py-3.5 text-left transition hover:bg-rose-soft"
          >
            <Mail className="h-5 w-5 shrink-0 animate-pulse-heart text-rose" />
            <div>
              <p className="text-sm font-semibold text-ink">Carta de {partnerName}</p>
              <p className="text-xs text-rose-deep">Pulsa para abrir</p>
            </div>
          </button>
        </li>
      );
    }
    return (
      <li className="rounded-2xl border border-sand bg-paper px-4 py-3.5 shadow-card">
        <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-soft">
          <MailOpen className="h-4 w-4" /> De {partnerName} · {whenLabel(letter.deliverAt)}
        </p>
        <p className="whitespace-pre-wrap text-read leading-relaxed text-ink">{letter.body}</p>
      </li>
    );
  }

  // carta mía: estado de entrega
  const status = !letter.delivered
    ? `En camino · llega el ${whenLabel(letter.deliverAt)}`
    : letter.opened
      ? "Leída ✓"
      : "Entregada · aún sin abrir";
  return (
    <li className="rounded-2xl border border-sand bg-paper/70 px-4 py-3.5">
      <p className="mb-1 flex items-center gap-2 text-xs font-medium text-ink-soft">
        {letter.delivered ? <MailOpen className="h-4 w-4" /> : <Hourglass className="h-4 w-4" />}
        Para {partnerName} · {status}
      </p>
      <p className="line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">{letter.body}</p>
    </li>
  );
}
