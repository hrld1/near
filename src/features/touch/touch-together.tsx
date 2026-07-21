"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Fingerprint, Heart } from "lucide-react";
import { sendLiveSignal, sendTouchLeaveBeacon } from "@/lib/quit-beacon";
import { useCoupleStream } from "@/hooks/use-stream";
import { heartbeat, sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { MemberInfo } from "@/types";

// El beso de pulgar. Ambos apoyan el dedo en la superficie; sus posiciones
// (normalizadas 0..1) viajan por el bus SSE. Cuando los dos dedos coinciden
// en la misma zona nace un latido: vibracion en patron de corazón, sonido
// grave y un resplandor que crece mientras sigan tocandose.

type Finger = { x: number; y: number; pressing: boolean };
const NEAR = 0.14; // umbral normalizado para considerar que los dedos se tocan

// La superficie es un lienzo oscuro fijo (mismo en claro y oscuro): así los
// resplandores rosados y ambar contrastan igual en cualquier tema.
const MINE_GLOW = "244,114,182"; // rosa
const THEIRS_GLOW = "251,191,36"; // ambar

export function TouchTogether({ me, partner }: { me: MemberInfo; partner: MemberInfo | null }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pressingRef = useRef(false);
  const partnerHereRef = useRef(false);
  const lastSentRef = useRef(0);
  const lastPosRef = useRef({ x: 0.5, y: 0.5 });
  const staleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mine, setMine] = useState<Finger>({ x: 0.5, y: 0.5, pressing: false });
  const [theirs, setTheirs] = useState<Finger | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);

  const partnerName = partner?.name ?? "tu pareja";

  // Presencia en la superficie: aviso al entrar y al salir (o al cerrar la
  // pestaña) para que el otro no vea un dedo fantasma.
  useEffect(() => {
    sendLiveSignal({ arena: "touch", kind: "join" });
    const onHide = () => sendTouchLeaveBeacon();
    window.addEventListener("pagehide", onHide);
    // Keepalive: mientras el dedo esté apoyado y quieto no hay pointermove,
    // así que reenviamos la posición ~1/s para que al otro no se le borre.
    const keepalive = setInterval(() => {
      if (!pressingRef.current) return;
      if (Date.now() - lastSentRef.current < 850) return;
      broadcast(lastPosRef.current.x, lastPosRef.current.y, true, true);
    }, 500);
    return () => {
      window.removeEventListener("pagehide", onHide);
      clearInterval(keepalive);
      if (staleRef.current) clearTimeout(staleRef.current);
      sendTouchLeaveBeacon();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markPartnerHere() {
    // Al descubrir a la pareja, respondemos "yo también estoy" UNA vez (el ref
    // corta el ping-pong): así quien llega tarde se entera de quien ya estaba.
    if (partnerHereRef.current) return;
    partnerHereRef.current = true;
    setPartnerHere(true);
    sendLiveSignal({ arena: "touch", kind: "join" });
  }

  useCoupleStream((event) => {
    if (event.type !== "touch:signal") return;
    const p = event.payload;
    if (p.userId === me.id) return;
    if (p.kind === "leave") {
      partnerHereRef.current = false;
      setPartnerHere(false);
      setTheirs(null);
      return;
    }
    if (p.kind === "join") {
      markPartnerHere();
      return;
    }
    if (p.kind === "move") {
      markPartnerHere();
      const pressing = Boolean(p.pressing);
      setTheirs({ x: p.x ?? 0.5, y: p.y ?? 0.5, pressing });
      // Un dedo que se queda congelado (crash a media pulsación) se oculta a
      // los 4s; soltar el dedo a propósito NO borra su presencia (eso lo hace
      // "leave"), y el keepalive evita que un dedo quieto se apague solo.
      if (staleRef.current) clearTimeout(staleRef.current);
      if (pressing) staleRef.current = setTimeout(() => setTheirs(null), 4000);
    }
  });

  function broadcast(x: number, y: number, pressing: boolean, force = false) {
    const now = Date.now();
    const moved = Math.hypot(x - lastPosRef.current.x, y - lastPosRef.current.y);
    // ~10 Hz mientras arrastra; los eventos de bajar/soltar el dedo van sin filtro
    if (!force && now - lastSentRef.current < 90 && moved < 0.008) return;
    lastSentRef.current = now;
    lastPosRef.current = { x, y };
    sendLiveSignal({ arena: "touch", kind: "move", x, y, pressing });
  }

  function normalize(e: React.PointerEvent) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    };
  }

  function onDown(e: React.PointerEvent) {
    surfaceRef.current?.setPointerCapture(e.pointerId);
    pressingRef.current = true;
    const { x, y } = normalize(e);
    setMine({ x, y, pressing: true });
    broadcast(x, y, true, true);
  }

  function onMove(e: React.PointerEvent) {
    if (!pressingRef.current) return;
    const { x, y } = normalize(e);
    setMine({ x, y, pressing: true });
    broadcast(x, y, true);
  }

  function onUp() {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    setMine((m) => ({ ...m, pressing: false }));
    broadcast(lastPosRef.current.x, lastPosRef.current.y, false, true);
  }

  const bothPressing = mine.pressing && Boolean(theirs?.pressing);
  const dist = theirs ? Math.hypot(mine.x - theirs.x, mine.y - theirs.y) : 1;
  const together = bothPressing && dist < NEAR;
  const midX = theirs ? (mine.x + theirs.x) / 2 : mine.x;
  const midY = theirs ? (mine.y + theirs.y) / 2 : mine.y;

  // El latido mientras los dedos se tocan: vibracion + sonido grave en bucle.
  useEffect(() => {
    if (!together) return;
    heartbeat();
    sfx.pulse();
    const id = setInterval(() => {
      heartbeat();
      sfx.pulse();
    }, 1150);
    return () => clearInterval(id);
  }, [together]);

  const status = !partner
    ? "Aún no hay nadie vinculado"
    : together
      ? "Os estáis tocando"
      : partnerHere && theirs?.pressing
        ? `${partnerName} está tocando — buscad el mismo punto`
        : partnerHere
          ? `${partnerName} está aquí — apoyad el dedo a la vez`
          : `Esperando a ${partnerName}…`;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink-soft transition hover:bg-sand hover:text-ink"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-ink">Tacto</h1>
          <p className="truncate text-sm text-ink-soft">{status}</p>
        </div>
        <span
          className={cn(
            "ml-auto h-2.5 w-2.5 rounded-full transition",
            partnerHere ? "bg-emerald-500" : "bg-sand-deep"
          )}
          title={partnerHere ? `${partnerName} está en Tacto` : `${partnerName} no está`}
        />
      </div>

      <div
        ref={surfaceRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative flex-1 touch-none select-none overflow-hidden rounded-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, #2a1220 0%, #150a12 62%, #0c0710 100%)"
        }}
      >
        {/* resplandor de fondo cuando os tocáis */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity: together ? 1 : 0,
            background: `radial-gradient(circle at ${midX * 100}% ${midY * 100}%, rgba(${MINE_GLOW},0.20), transparent 55%)`
          }}
        />

        {/* pista central en reposo */}
        {!mine.pressing && !theirs?.pressing && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/45">
            <Fingerprint className="h-10 w-10 motion-safe:animate-pulse" />
            <p className="max-w-xs text-sm">
              Apoya el dedo en la pantalla. Cuando {partnerName} apoye el suyo,
              buscad el mismo punto.
            </p>
          </div>
        )}

        {/* el resplandor que crece mientras seguís juntos */}
        <div
          className="pointer-events-none absolute h-72 w-72 rounded-full transition-all duration-[2400ms] ease-out"
          style={{
            left: `${midX * 100}%`,
            top: `${midY * 100}%`,
            transform: `translate(-50%, -50%) scale(${together ? 1 : 0})`,
            opacity: together ? 1 : 0,
            background: `radial-gradient(circle, rgba(${MINE_GLOW},0.55), rgba(${THEIRS_GLOW},0.30) 55%, transparent 72%)`
          }}
        />
        {together && (
          <Heart
            className="pointer-events-none absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 fill-current text-white motion-safe:animate-pulse-heart"
            style={{ left: `${midX * 100}%`, top: `${midY * 100}%` }}
          />
        )}

        {/* dedo de la pareja */}
        {partnerHere && theirs?.pressing && (
          <>
            <div
              className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${theirs.x * 100}%`,
                top: `${theirs.y * 100}%`,
                background: `radial-gradient(circle, rgba(${THEIRS_GLOW},0.95), rgba(${THEIRS_GLOW},0.15) 62%, transparent 72%)`,
                boxShadow: `0 0 46px 14px rgba(${THEIRS_GLOW},0.5)`,
                transition: "left 90ms linear, top 90ms linear"
              }}
            />
            <span
              className="pointer-events-none absolute -translate-x-1/2 translate-y-6 whitespace-nowrap text-xs font-medium text-white/70"
              style={{ left: `${theirs.x * 100}%`, top: `${theirs.y * 100}%` }}
            >
              {partnerName}
            </span>
          </>
        )}

        {/* mi dedo */}
        {mine.pressing && (
          <div
            className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${mine.x * 100}%`,
              top: `${mine.y * 100}%`,
              background: `radial-gradient(circle, rgba(${MINE_GLOW},0.95), rgba(${MINE_GLOW},0.15) 62%, transparent 72%)`,
              boxShadow: `0 0 46px 14px rgba(${MINE_GLOW},0.5)`
            }}
          />
        )}
      </div>
    </div>
  );
}
