"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Moon, Phone, PhoneOff, ScreenShare, ScreenShareOff, Video, VideoOff } from "lucide-react";
import { useCall } from "@/features/call/call-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Escenario de la llamada DENTRO de la sala: solo pinta imagen. El audio
// remoto suena en el <audio> del CallProvider (global, sobrevive a navegar),
// así que aquí los <video> van muted para no duplicar sonido. Iniciar,
// aceptar, colgar y demas controles salen del contexto global useCall().
export function CallStage() {
  const {
    state,
    muted,
    cameraOff,
    elapsed,
    notice,
    mediaMode,
    partner,
    localStream,
    remoteStream,
    screenStream,
    partnerSharingScreen,
    startCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    startSleep,
    hangup,
    clearNotice
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Mientras compartes, tu propia miniatura enseña la pantalla que se está
  // retransmitiendo (para que veas exactamente lo que ve tu pareja), no tu
  // cámara — que sigue grabándose pero ya no sale por la llamada.
  const sharingScreen = !!screenStream;
  const localPreview = screenStream ?? localStream;
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localPreview;
  }, [localPreview]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const partnerName = partner?.name ?? "tu pareja";
  const inCall = state === "outgoing" || state === "connecting" || state === "active";
  const hasLocalVideo = mediaMode === "full";
  const hasLocalAudio = mediaMode !== "none";
  // No todos los navegadores/contextos exponen captura de pantalla (Safari
  // móvil, contextos no seguros): el botón solo aparece si de verdad sirve.
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // En reposo (o mientras entra una llamada: eso lo gestiona el overlay
  // global) mostramos el CTA para llamar.
  if (!inCall) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-paper px-4 py-3 shadow-card">
        <Video className="h-5 w-5 shrink-0 text-rose" />
        <p className="min-w-0 flex-1 text-sm text-ink">
          Videollamada P2P, directa entre vosotros.
        </p>
        {notice && (
          <button
            onClick={clearNotice}
            className="max-w-56 text-right text-xs text-ink-soft hover:text-ink"
            title="Descartar"
          >
            {notice}
          </button>
        )}
        <Button size="sm" variant="secondary" onClick={() => startCall({ audioOnly: true })}>
          Solo audio
        </Button>
        <Button size="sm" onClick={() => startCall()}>
          <Phone className="h-3.5 w-3.5" /> Llamar
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={cn("h-full w-full", partnerSharingScreen ? "object-contain" : "object-cover")}
        />
        {/* badges de la esquina: hora + aviso de pantalla compartida, en
            columna para que no se pisen si aparecen los dos a la vez */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {state === "active" && (
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          )}
          {partnerSharingScreen && state === "active" && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <ScreenShare className="h-3.5 w-3.5" />
              {partnerName} comparte su pantalla
            </span>
          )}
        </div>
        {state !== "active" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <Phone className="h-6 w-6 animate-pulse" />
            <p className="text-sm">
              {state === "outgoing" ? `Llamando a ${partnerName}...` : "Conectando..."}
            </p>
          </div>
        )}
        {hasLocalVideo ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute bottom-3 right-3 w-28 rounded-lg border shadow-lift sm:w-36",
              sharingScreen ? "border-emerald-400 object-contain bg-black" : "border-white/20 object-cover",
              cameraOff && !sharingScreen && "opacity-30"
            )}
          />
        ) : (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {mediaMode === "audio" ? "Solo audio" : "Espectador"}
          </span>
        )}
        {notice && state !== "active" && (
          <span className="absolute inset-x-3 bottom-3 rounded-xl bg-black/50 px-3 py-1.5 text-center text-[11px] text-white/90 backdrop-blur-sm">
            {notice}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        <button
          onClick={toggleMute}
          disabled={!hasLocalAudio}
          className={cn(
            "rounded-full p-3 transition disabled:opacity-40",
            muted ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-sand text-ink hover:bg-sand-deep"
          )}
          title={muted ? "Activar micro" : "Silenciar"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleCamera}
          disabled={!hasLocalVideo}
          className={cn(
            "rounded-full p-3 transition disabled:opacity-40",
            cameraOff ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-sand text-ink hover:bg-sand-deep"
          )}
          title={cameraOff ? "Activar cámara" : "Apagar cámara"}
        >
          {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
        {canShareScreen && state === "active" && (
          <button
            onClick={() => void toggleScreenShare()}
            disabled={!hasLocalVideo}
            className={cn(
              "rounded-full p-3 transition disabled:opacity-40",
              sharingScreen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-sand text-ink hover:bg-sand-deep"
            )}
            title={
              !hasLocalVideo
                ? "Necesitas la cámara activada para compartir pantalla"
                : sharingScreen
                  ? "Dejar de compartir"
                  : "Compartir pantalla"
            }
          >
            {sharingScreen ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
          </button>
        )}
        {state === "active" && (
          <button
            onClick={startSleep}
            className="rounded-full bg-sand p-3 text-ink transition hover:bg-sand-deep"
            title="Dormir juntos"
          >
            <Moon className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={hangup}
          className="rounded-full bg-red-500 p-3 text-white transition hover:bg-red-600"
          title="Colgar"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
