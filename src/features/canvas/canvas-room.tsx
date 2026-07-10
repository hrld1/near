"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Palette, Pencil, Sparkles } from "lucide-react";
import { useCoupleStream } from "@/hooks/use-stream";
import { SharedCanvas } from "@/features/canvas/shared-canvas";
import { DrawTogether } from "@/features/canvas/draw-together";
import { DrawGuess } from "@/features/canvas/draw-guess";
import { cn } from "@/lib/utils";
import type { CanvasStroke, MemberInfo } from "@/types";

type Mode = "free" | "together" | "guess";
type Pending =
  | { mode: "together"; roundId: string; word: string; duration: number }
  | { mode: "guess"; roundId: string }
  | null;

const TABS: { key: Mode; label: string; icon: typeof Palette }[] = [
  { key: "free", label: "Libre", icon: Palette },
  { key: "together", label: "Dibujad a la vez", icon: Sparkles },
  { key: "guess", label: "Dibuja y adivina", icon: Pencil }
];

// Sala del lienzo: elige modo (libre / dos juegos) y, si tu pareja te reta
// desde otra pestaña, te trae al modo correcto con la ronda ya empezada.
export function CanvasRoom({
  me,
  partner,
  initialStrokes
}: {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialStrokes: CanvasStroke[];
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [pending, setPending] = useState<Pending>(null);
  const modeRef = useRef<Mode>("free");
  modeRef.current = mode;

  const partnerName = partner?.name ?? "tu pareja";

  useCoupleStream((event) => {
    if (event.type !== "draw:game" || event.payload.kind !== "start") return;
    const p = event.payload;
    if (p.byId === me.id) return;
    // solo cambiamos de pestaña si NO estamos ya en ese modo (allí el juego lo
    // maneja su propio listener en vivo)
    if (p.mode === "together" && modeRef.current !== "together" && p.word && p.duration) {
      setPending({ mode: "together", roundId: p.roundId, word: p.word, duration: p.duration });
      setMode("together");
    }
    if (p.mode === "guess" && modeRef.current !== "guess") {
      setPending({ mode: "guess", roundId: p.roundId });
      setMode("guess");
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/juntos"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink-soft transition hover:bg-sand hover:text-ink"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl leading-tight text-ink">Lienzo</h1>
      </div>

      <div className="flex gap-1 rounded-full bg-sand p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium transition sm:text-sm",
              mode === t.key ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {mode === "free" && (
        <SharedCanvas me={me} partner={partner} initialStrokes={initialStrokes} />
      )}
      {mode === "together" && (
        <DrawTogether
          me={me}
          partnerName={partnerName}
          initialStart={pending?.mode === "together" ? pending : null}
          onConsumed={() => setPending(null)}
        />
      )}
      {mode === "guess" && (
        <DrawGuess
          me={me}
          partnerName={partnerName}
          initialStart={pending?.mode === "guess" ? pending : null}
          onConsumed={() => setPending(null)}
        />
      )}
    </div>
  );
}
