"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Palette, RotateCcw } from "lucide-react";
// initialStart: cuando la pareja te reta desde otra pestaña, CanvasRoom te trae aquí.
import { drawGameAction } from "@/actions/draw-game";
import { createMomentAction } from "@/actions/moments";
import { uploadFile } from "@/lib/upload-client";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx } from "@/lib/sound";
import { randomWord } from "@/lib/draw-words";
import { DrawSurface, type DrawHandle } from "@/features/canvas/draw-surface";
import { CanvasToolbar } from "@/features/canvas/canvas-toolbar";
import type { MemberInfo } from "@/types";

const COLORS = ["#e11d48", "#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#1f2937", "#fbbf24"];
const SIZES = [3, 7, 14];
const DURATION = 60; // segundos

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

type Phase = "idle" | "drawing" | "reveal";

// "Dibujad a la vez": la misma palabra para los dos, a ciegas y contrarreloj.
// Al acabar se revelan los dos dibujos y cada uno guarda el suyo en el álbum.
export function DrawTogether({
  me,
  partnerName,
  initialStart,
  onConsumed
}: {
  me: MemberInfo;
  partnerName: string;
  initialStart?: { roundId: string; word: string; duration: number } | null;
  onConsumed?: () => void;
}) {
  const surface = useRef<DrawHandle>(null);
  const roundRef = useRef<{ id: string; word: string; endAt: number } | null>(null);
  const submittedRef = useRef(false);
  const lastSent = useRef(0);

  // si llego aquí por un reto de mi pareja, empiezo la ronda que trae
  useEffect(() => {
    if (initialStart) {
      beginRound(initialStart.roundId, initialStart.word, Date.now() + initialStart.duration * 1000);
      onConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState<Phase>("idle");
  const [word, setWord] = useState("");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [partnerUrl, setPartnerUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function beginRound(id: string, w: string, endAt: number) {
    roundRef.current = { id, word: w, endAt };
    submittedRef.current = false;
    setWord(w);
    setMyUrl(null);
    setPartnerUrl(null);
    surface.current?.clear();
    setPhase("drawing");
    sfx.success();
  }

  function start() {
    const id = uid();
    const w = randomWord(word);
    const endAt = Date.now() + DURATION * 1000;
    void drawGameAction({ kind: "start", mode: "together", roundId: id, word: w, startAt: endAt - DURATION * 1000, duration: DURATION });
    beginRound(id, w, endAt);
  }

  async function finishRound() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const round = roundRef.current;
    setPhase("reveal");
    setSaving(true);
    try {
      const blob = await surface.current?.toBlob();
      if (blob && round) {
        const url = await uploadFile(blob, `dibujo-${Date.now()}.png`);
        setMyUrl(url);
        void createMomentAction({ kind: "PHOTO", imageUrl: url, title: `"${round.word}" — por mí` });
        void drawGameAction({ kind: "submit", mode: "together", roundId: round.id, imageUrl: url });
      }
    } catch {
      // subida fallida: se revela igualmente lo que haya
    } finally {
      setSaving(false);
    }
  }

  // temporizador: cuenta atrás y auto-entrega al acabar
  useEffect(() => {
    if (phase !== "drawing") return;
    const tick = () => {
      const round = roundRef.current;
      if (!round) return;
      const left = Math.max(0, Math.ceil((round.endAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) void finishRound();
    };
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useCoupleStream((event) => {
    if (event.type !== "draw:game" || event.payload.mode !== "together") return;
    const p = event.payload;
    if (p.byId === me.id) return;
    if (p.kind === "start" && p.word && p.duration) {
      // si los dos empezamos a la vez, gana el roundId menor (converge la palabra)
      const cur = roundRef.current;
      if (phase === "drawing" && cur && cur.id <= p.roundId) return;
      beginRound(p.roundId, p.word, Date.now() + p.duration * 1000);
    }
    if (p.kind === "submit" && p.imageUrl && roundRef.current?.id === p.roundId) {
      setPartnerUrl(p.imageUrl);
    }
    if (p.kind === "quit") {
      roundRef.current = null;
      setPhase("idle");
    }
  });

  function onLocalStroke(s: import("@/types").CanvasStroke, done: boolean) {
    // en "a la vez" NO se comparte el trazo en vivo (es a ciegas): nada que enviar
    void s;
    void done;
    void lastSent;
  }

  if (phase === "idle") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-3xl border border-sand bg-paper p-8 text-center shadow-card">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose/12 text-rose-deep">
          <Palette className="h-8 w-8" />
        </span>
        <div>
          <h2 className="font-display text-2xl text-ink">Dibujad a la vez</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            La misma palabra para los dos, {DURATION}s a ciegas. Al acabar veis
            los dos dibujos y se guardan en el álbum.
          </p>
        </div>
        <button
          onClick={start}
          className="rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-deep"
        >
          Empezar una ronda
        </button>
        <p className="text-xs text-ink-soft">{partnerName} se unirá al empezar.</p>
      </div>
    );
  }

  if (phase === "reveal") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-sand bg-paper p-4 text-center shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-deep">La palabra era</p>
          <p className="font-display text-3xl text-ink">{word}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
            <figcaption className="border-b border-sand px-3 py-1.5 text-xs font-semibold text-ink">Tú</figcaption>
            {myUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myUrl} alt="Tu dibujo" className="aspect-[4/3] w-full object-contain" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-ink-soft">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "—"}
              </div>
            )}
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
            <figcaption className="border-b border-sand px-3 py-1.5 text-xs font-semibold text-ink">{partnerName}</figcaption>
            {partnerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partnerUrl} alt={`Dibujo de ${partnerName}`} className="aspect-[4/3] w-full object-contain" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-sm text-ink-soft">
                Esperando el dibujo de {partnerName}…
              </div>
            )}
          </figure>
        </div>
        <button
          onClick={start}
          className="mx-auto flex items-center gap-2 rounded-full bg-rose px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-deep"
        >
          <RotateCcw className="h-4 w-4" /> Otra ronda
        </button>
      </div>
    );
  }

  // phase === "drawing"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-rose/20 bg-rose-faint px-4 py-2.5">
        <p className="text-sm text-ink">
          Dibuja: <b className="font-display text-lg text-rose-deep">{word}</b>
        </p>
        <span
          className={`flex items-center gap-1.5 font-display text-xl tabular-nums ${timeLeft <= 10 ? "text-red-600" : "text-ink"}`}
        >
          <Clock className="h-4 w-4" /> {timeLeft}s
        </span>
      </div>
      <CanvasToolbar colors={COLORS} sizes={SIZES} color={color} size={size} onColor={setColor} onSize={setSize} />
      <DrawSurface
        ref={surface}
        color={color}
        size={size}
        onLocalStroke={onLocalStroke}
        className="aspect-[4/3] w-full rounded-3xl border border-rose/15 shadow-card"
      />
      <p className="text-center text-xs text-ink-soft">A ciegas: {partnerName} no ve tu dibujo hasta el final.</p>
    </div>
  );
}
