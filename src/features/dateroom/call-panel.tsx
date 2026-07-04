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

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "active";

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

  const stateRef = useRef<CallState>("idle");
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
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

  useEffect(() => () => cleanup(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureMedia(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }

  function createPeer(stream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void callSignalAction({ kind: "ice", data: JSON.stringify(event.candidate.toJSON()) });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallState("active");
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        if (stateRef.current !== "idle") cleanup(false, "Conexion perdida");
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
          setCallState("connecting");
          const pc = pcRef.current;
          if (!pc) break;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await callSignalAction({ kind: "offer", data: JSON.stringify(offer) });
          break;
        }
        case "offer": {
          if (roleRef.current !== "callee") break;
          const pc = pcRef.current;
          if (!pc || !signal.data) break;
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
    } catch {
      cleanup(false, "Error en la llamada");
    }
  }

  async function startCall() {
    setNotice(null);
    try {
      const stream = await ensureMedia();
      createPeer(stream);
      roleRef.current = "caller";
      setCallState("outgoing");
      await callSignalAction({ kind: "ring" });
    } catch {
      setNotice("No se pudo acceder a camara/microfono");
      cleanup(false);
    }
  }

  async function acceptCall() {
    setNotice(null);
    try {
      const stream = await ensureMedia();
      createPeer(stream);
      roleRef.current = "callee";
      setCallState("connecting");
      await callSignalAction({ kind: "accept" });
    } catch {
      setNotice("No se pudo acceder a camara/microfono");
      void callSignalAction({ kind: "decline" });
      cleanup(false);
    }
  }

  function declineCall() {
    void callSignalAction({ kind: "decline" });
    cleanup(false);
  }

  function hangup() {
    void callSignalAction({ kind: "hangup" });
    cleanup(false, "Llamada terminada");
  }

  function cleanup(silent: boolean, message?: string) {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
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

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-paper shadow-card">
      {state === "idle" && (
        <div className="flex items-center gap-3 px-4 py-3">
          <Video className="h-5 w-5 shrink-0 text-rose" />
          <p className="flex-1 text-sm text-ink">
            Videollamada P2P, directa entre vosotros.
          </p>
          {notice && <span className="text-xs text-ink-soft">{notice}</span>}
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
            {state === "active" && (
              <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <button
              onClick={toggleMute}
              className={cn(
                "rounded-full p-3 transition",
                muted ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-sand text-ink hover:bg-sand-deep"
              )}
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleCamera}
              className={cn(
                "rounded-full p-3 transition",
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
