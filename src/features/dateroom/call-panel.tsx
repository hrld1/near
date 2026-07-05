"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { callSignalAction } from "@/actions/call";
import { useCoupleStream } from "@/hooks/use-stream";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MemberInfo } from "@/types";

// Videollamada P2P real (WebRTC). Senalizacion: bus SSE de la pareja.
// STUN publico de Google por defecto; TURN opcional via env (ver README)
// para redes con NAT estricto.
//
// Robustez de medios: si la camara esta ocupada (tipico al probar con dos
// navegadores en el mismo PC: el primero se la queda en exclusiva) se cae
// a solo-audio, y si tampoco hay micro se entra en modo espectador con
// transceivers recvonly. La llamada nunca revienta por falta de camara.

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "active";
type MediaMode = "full" | "audio" | "none";

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL
    });
  }
  return servers;
}

export function CallPanel({ me, partnerName }: { me: MemberInfo; partnerName: string }) {
  const [state, setState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaMode>("full");

  const stateRef = useRef<CallState>("idle");
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaModeRef = useRef<MediaMode>("full");
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  function setCallState(next: CallState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    if (state !== "active") return;
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => () => cleanup(true), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pide medios degradando con elegancia: video+audio -> audio -> nada.
  async function ensureMedia(): Promise<{ stream: MediaStream | null; mode: MediaMode }> {
    if (localStreamRef.current) {
      return { stream: localStreamRef.current, mode: mediaModeRef.current };
    }
    const remember = (stream: MediaStream | null, mode: MediaMode) => {
      localStreamRef.current = stream;
      mediaModeRef.current = mode;
      setMediaMode(mode);
      if (stream && localVideoRef.current) localVideoRef.current.srcObject = stream;
      return { stream, mode };
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      return remember(stream, "full");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        // permiso denegado del todo: no insistimos con audio
        throw err;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setNotice("Camara no disponible (en uso por otra app o navegador): entras solo con audio");
        return remember(stream, "audio");
      } catch {
        setNotice("Sin camara ni micro disponibles: entras en modo espectador");
        return remember(null, "none");
      }
    }
  }

  function createPeer(stream: MediaStream | null): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));
    // sin track propio de un tipo, seguimos queriendo RECIBIR el del otro
    const kinds = new Set(stream?.getTracks().map((t) => t.kind) ?? []);
    if (!kinds.has("video")) pc.addTransceiver("video", { direction: "recvonly" });
    if (!kinds.has("audio")) pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
      if (!remoteVideoRef.current) return;
      const remote = event.streams[0];
      if (remote) {
        remoteVideoRef.current.srcObject = remote;
      } else {
        const current = (remoteVideoRef.current.srcObject as MediaStream | null) ?? new MediaStream();
        current.addTrack(event.track);
        remoteVideoRef.current.srcObject = current;
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void callSignalAction({ kind: "ice", data: JSON.stringify(event.candidate.toJSON()) });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc !== pcRef.current) return;
      if (pc.connectionState === "connected") {
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
        setCallState("active");
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (stateRef.current !== "idle") cleanup(false, "Conexion perdida");
      }
      // "disconnected" suele ser transitorio (cambio de red, hipo de ICE):
      // damos 7s de gracia antes de rendirnos
      if (pc.connectionState === "disconnected") {
        graceTimerRef.current = setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState !== "connected" && stateRef.current !== "idle") {
            cleanup(false, "Conexion perdida");
          }
        }, 7000);
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function drainIce() {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    for (const candidate of pendingIceRef.current.splice(0)) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // candidato invalido: ignorar
      }
    }
  }

  useCoupleStream((event) => {
    if (event.type !== "call:signal") return;
    if (event.payload.fromId === me.id) return;
    void handleSignal(event.payload);
  });

  async function handleSignal(signal: { kind: string; data: string | null }) {
    try {
      switch (signal.kind) {
        case "ring":
          if (stateRef.current === "idle") setCallState("incoming");
          break;
        case "accept": {
          if (roleRef.current !== "caller") break;
          const pc = pcRef.current;
          // un "accept" duplicado o fuera de sitio no debe re-negociar
          if (!pc || pc.signalingState !== "stable") break;
          setCallState("connecting");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await callSignalAction({ kind: "offer", data: JSON.stringify(offer) });
          break;
        }
        case "offer": {
          if (roleRef.current !== "callee") break;
          const pc = pcRef.current;
          if (!pc || !signal.data) break;
          if (pc.signalingState !== "stable") break;
          await pc.setRemoteDescription(JSON.parse(signal.data));
          await drainIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await callSignalAction({ kind: "answer", data: JSON.stringify(answer) });
          break;
        }
        case "answer": {
          const pc = pcRef.current;
          if (!pc || !signal.data) break;
          if (pc.signalingState !== "have-local-offer") break;
          await pc.setRemoteDescription(JSON.parse(signal.data));
          await drainIce();
          break;
        }
        case "ice": {
          if (!signal.data) break;
          const candidate = JSON.parse(signal.data) as RTCIceCandidateInit;
          if (pcRef.current?.remoteDescription) {
            await pcRef.current.addIceCandidate(candidate).catch(() => undefined);
          } else {
            pendingIceRef.current.push(candidate);
          }
          break;
        }
        case "decline":
          if (roleRef.current === "caller") cleanup(false, `${partnerName} no puede ahora`);
          break;
        case "hangup":
          if (stateRef.current !== "idle") cleanup(false, "Llamada terminada");
          break;
      }
    } catch (err) {
      // una senal rota no debe tirar una llamada ya activa
      if (stateRef.current !== "active") {
        cleanup(false, mediaErrorMessage(err));
      }
    }
  }

  function mediaErrorMessage(err: unknown): string {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError") return "Permiso de camara/micro denegado en el navegador";
    if (name === "NotReadableError" || name === "AbortError") {
      return "La camara esta en uso por otra aplicacion o navegador";
    }
    if (name === "NotFoundError") return "No se ha encontrado camara ni microfono";
    return "No se pudo establecer la llamada";
  }

  async function startCall() {
    setNotice(null);
    try {
      const { stream } = await ensureMedia();
      createPeer(stream);
      roleRef.current = "caller";
      setCallState("outgoing");
      await callSignalAction({ kind: "ring" });
    } catch (err) {
      cleanup(false, mediaErrorMessage(err));
    }
  }

  async function acceptCall() {
    setNotice(null);
    try {
      const { stream } = await ensureMedia();
      createPeer(stream);
      roleRef.current = "callee";
      setCallState("connecting");
      await callSignalAction({ kind: "accept" });
    } catch (err) {
      void callSignalAction({ kind: "decline" });
      cleanup(false, mediaErrorMessage(err));
    }
  }

  function declineCall() {
    void callSignalAction({ kind: "decline" });
    cleanup(true);
  }

  function hangup() {
    void callSignalAction({ kind: "hangup" });
    cleanup(false, "Llamada terminada");
  }

  function cleanup(silent: boolean, message?: string) {
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    mediaModeRef.current = "full";
    setMediaMode("full");
    pendingIceRef.current = [];
    roleRef.current = null;
    setMuted(false);
    setCameraOff(false);
    setElapsed(0);
    setCallState("idle");
    if (!silent && message) setNotice(message);
  }

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }

  const inCall = state === "connecting" || state === "active" || state === "outgoing";
  const hasLocalVideo = mediaMode === "full";
  const hasLocalAudio = mediaMode !== "none";

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
      {state === "idle" && (
        <div className="flex items-center gap-3 px-4 py-3">
          <Video className="h-5 w-5 shrink-0 text-rose" />
          <p className="flex-1 text-sm text-ink">
            Videollamada P2P, directa entre vosotros.
          </p>
          {notice && <span className="max-w-56 text-right text-xs text-ink-soft">{notice}</span>}
          <Button size="sm" onClick={startCall}>
            <Phone className="h-3.5 w-3.5" /> Llamar
          </Button>
        </div>
      )}

      {state === "incoming" && (
        <div className="flex items-center gap-3 bg-rose-faint px-4 py-3">
          <Phone className="h-5 w-5 shrink-0 animate-pulse-heart text-rose" />
          <p className="flex-1 text-sm font-medium text-ink">{partnerName} te esta llamando</p>
          <Button size="sm" onClick={acceptCall}>
            Aceptar
          </Button>
          <Button size="sm" variant="secondary" onClick={declineCall}>
            Ahora no
          </Button>
        </div>
      )}

      {inCall && (
        <div>
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
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
                  "absolute bottom-3 right-3 w-28 rounded-lg border border-white/20 object-cover shadow-lift sm:w-36",
                  cameraOff && "opacity-30"
                )}
              />
            ) : (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {mediaMode === "audio" ? "Solo audio" : "Espectador"}
              </span>
            )}
            {state === "active" && (
              <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
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
            >
              {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </button>
            <button
              onClick={hangup}
              className="rounded-full bg-red-500 p-3 text-white transition hover:bg-red-600"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
