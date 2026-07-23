"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Moon, Phone, PhoneOff, Sun } from "lucide-react";
import { sendHangupBeacon, sendLiveSignal } from "@/lib/quit-beacon";
import { useCoupleStream } from "@/hooks/use-stream";
import { heartbeat, sfx, vibrate } from "@/lib/sound";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CallSignalKind, MemberInfo } from "@/types";

// Motor de llamada GLOBAL de Near. Vive en el layout de (app), por encima de
// las páginas: la llamada suena y sigue viva en cualquier pantalla, y navegar
// no la corta. El audio remoto se reproduce SIEMPRE en un <audio> oculto de
// este provider; los <video> de la sala solo pintan imagen (van muted) para
// no duplicar el sonido.
//
// Robustez heredada del panel original: degradacion de medios (video+audio ->
// audio -> espectador con transceivers recvonly), guardas de negociacion,
// cola de ICE y 7s de gracia ante cortes transitorios. Nuevo aquí:
// - re-ring cada 4s mientras llamas (si el otro abre la app a mitad, le suena)
// - watchdog del entrante (si dejan de llegar rings, la invitación se apaga)
// - tono + vibracion de llamada entrante, timeout de "no contesta" a los 45s

type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "active";
type MediaMode = "full" | "audio" | "none";

type CallContextValue = {
  state: CallState;
  muted: boolean;
  cameraOff: boolean;
  elapsed: number;
  notice: string | null;
  mediaMode: MediaMode;
  sleeping: boolean;
  partner: MemberInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  partnerSharingScreen: boolean;
  startCall: (opts?: { audioOnly?: boolean }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  startSleep: () => void;
  wakeUp: () => void;
  goodnight: () => void;
  clearNotice: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall fuera de CallProvider");
  return value;
}

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

export function CallProvider({
  me,
  partner,
  myTimezone,
  partnerTimezone,
  children
}: {
  me: MemberInfo;
  partner: MemberInfo | null;
  myTimezone: string;
  partnerTimezone: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaMode>("full");
  const [sleeping, setSleeping] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [partnerSharingScreen, setPartnerSharingScreen] = useState(false);

  const stateRef = useRef<CallState>("idle");
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // Credenciales TURN frescas del servidor (Cloudflare, it31). Si /api/ice no
  // trae nada (instancia sin claves, fallo de red), vale el fallback estático.
  const iceRef = useRef<RTCIceServer[] | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaModeRef = useRef<MediaMode>("full");
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reRingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noAnswerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRingAtRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const buzzRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  function setCallState(next: CallState) {
    stateRef.current = next;
    setState(next);
  }

  // cronometro de llamada activa
  useEffect(() => {
    if (state !== "active") return;
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  // tono + vibracion mientras hay llamada entrante
  useEffect(() => {
    if (state !== "incoming") return;
    stopRingtoneRef.current = sfx.startRing();
    vibrate([70, 90, 70]);
    buzzRef.current = setInterval(() => vibrate([70, 90, 70]), 1900);
    return () => {
      stopRingtoneRef.current?.();
      stopRingtoneRef.current = null;
      if (buzzRef.current) clearInterval(buzzRef.current);
      buzzRef.current = null;
    };
  }, [state]);

  // audio remoto: suena aquí, en cualquier página
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => () => cleanup(true), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar la pestaña en mitad de una llamada tiene que colgar. Va por beacon
  // porque en `pagehide` una petición normal ya no llega. Sin esto, el otro se
  // queda con la llamada abierta y sonando hasta que se rinde.
  useEffect(() => {
    const onLeave = () => {
      if (stateRef.current !== "idle") sendHangupBeacon();
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  // Pide medios degradando con elegancia: video+audio -> audio -> nada.
  async function ensureMedia(audioOnly = false): Promise<{ stream: MediaStream | null; mode: MediaMode }> {
    if (localStreamRef.current) {
      return { stream: localStreamRef.current, mode: mediaModeRef.current };
    }
    const remember = (stream: MediaStream | null, mode: MediaMode) => {
      localStreamRef.current = stream;
      mediaModeRef.current = mode;
      setMediaMode(mode);
      setLocalStream(stream);
      return { stream, mode };
    };
    if (!audioOnly) {
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
        // cae al intento de solo-audio de abajo
        setNotice("Cámara no disponible (en uso por otra app o navegador): entras solo con audio");
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return remember(stream, "audio");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" && audioOnly) throw err;
      setNotice("Sin cámara ni micro disponibles: entras en modo espectador");
      return remember(null, "none");
    }
  }

  async function refreshIceServers(): Promise<void> {
    try {
      const res = await fetch("/api/ice", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { iceServers?: RTCIceServer[] | null };
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        iceRef.current = data.iceServers;
      }
    } catch {
      // sin red o sin claves: el fallback estático sigue valiendo
    }
  }

  function createPeer(stream: MediaStream | null): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: iceRef.current ?? iceServers() });
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));
    // sin track propio de un tipo, seguimos queriendo RECIBIR el del otro
    const kinds = new Set(stream?.getTracks().map((t) => t.kind) ?? []);
    if (!kinds.has("video")) pc.addTransceiver("video", { direction: "recvonly" });
    if (!kinds.has("audio")) pc.addTransceiver("audio", { direction: "recvonly" });

    const assembled = new MediaStream();
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (remote) {
        setRemoteStream(remote);
      } else {
        assembled.addTrack(event.track);
        setRemoteStream(assembled);
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendLiveSignal({ arena: "call", kind: "ice", data: JSON.stringify(event.candidate.toJSON()) });
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
        if (stateRef.current !== "idle") cleanup(false, "Conexión perdida");
      }
      // "disconnected" suele ser transitorio (cambio de red, hipo de ICE):
      // damos 7s de gracia antes de rendirnos
      if (pc.connectionState === "disconnected") {
        graceTimerRef.current = setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState !== "connected" && stateRef.current !== "idle") {
            cleanup(false, "Conexión perdida");
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

  async function handleSignal(signal: { kind: CallSignalKind; data: string | null }) {
    try {
      switch (signal.kind) {
        case "ring":
          lastRingAtRef.current = Date.now();
          if (stateRef.current === "idle") {
            setCallState("incoming");
            // si el que llama desaparece (cierra la pestaña, pierde red),
            // sus re-rings dejan de llegar y la invitación se apaga sola
            watchdogRef.current = setInterval(() => {
              if (stateRef.current === "incoming" && Date.now() - lastRingAtRef.current > 12000) {
                cleanup(false, "Llamada perdida");
              }
            }, 3000);
          }
          break;
        case "accept": {
          if (roleRef.current !== "caller") break;
          const pc = pcRef.current;
          // un "accept" duplicado o fuera de sitio no debe re-negociar
          if (!pc || pc.signalingState !== "stable") break;
          stopOutgoingTimers();
          setCallState("connecting");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendLiveSignal({ arena: "call", kind: "offer", data: JSON.stringify(offer) });
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
          sendLiveSignal({ arena: "call", kind: "answer", data: JSON.stringify(answer) });
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
          if (roleRef.current === "caller") {
            cleanup(false, `${partner?.name ?? "Tu pareja"} no puede ahora`);
          }
          break;
        case "hangup":
          if (stateRef.current !== "idle") cleanup(false, "Llamada terminada");
          break;
        // modo dormir juntos: atenuar es informativo (se refleja en ambos)
        case "sleep":
          if (stateRef.current === "active") setSleeping(true);
          break;
        case "wake":
          setSleeping(false);
          break;
        case "goodnight":
          if (stateRef.current !== "idle") {
            heartbeat();
            sfx.goodnight();
            cleanup(false, "Buenas noches");
          }
          break;
        case "screen": {
          if (!signal.data) break;
          const payload = JSON.parse(signal.data) as { on: boolean };
          setPartnerSharingScreen(payload.on);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      // una señal rota no debe tirar una llamada ya activa
      if (stateRef.current !== "active") {
        cleanup(false, mediaErrorMessage(err));
      }
    }
  }

  function mediaErrorMessage(err: unknown): string {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError") return "Permiso de cámara/micro denegado en el navegador";
    if (name === "NotReadableError" || name === "AbortError") {
      return "La cámara está en uso por otra aplicación o navegador";
    }
    if (name === "NotFoundError") return "No se ha encontrado cámara ni micrófono";
    return "No se pudo establecer la llamada";
  }

  function stopOutgoingTimers() {
    if (reRingRef.current) clearInterval(reRingRef.current);
    reRingRef.current = null;
    if (noAnswerRef.current) clearTimeout(noAnswerRef.current);
    noAnswerRef.current = null;
  }

  async function startCall(opts?: { audioOnly?: boolean }) {
    if (!partner) {
      setNotice("Aún no hay nadie vinculado a quien llamar");
      return;
    }
    if (stateRef.current !== "idle") return;
    setNotice(null);
    try {
      // TURN fresco en paralelo con el permiso de cámara/micrófono
      const icePromise = refreshIceServers();
      const { stream } = await ensureMedia(opts?.audioOnly ?? false);
      await icePromise;
      createPeer(stream);
      roleRef.current = "caller";
      setCallState("outgoing");
      // primer ring con push ("te esta llamando" aunque tenga la app cerrada);
      // los re-rings solo viajan por el bus
      sendLiveSignal({ arena: "call", kind: "ring", initial: true });
      reRingRef.current = setInterval(() => {
        if (stateRef.current === "outgoing") sendLiveSignal({ arena: "call", kind: "ring" });
      }, 4000);
      noAnswerRef.current = setTimeout(() => {
        if (stateRef.current === "outgoing") {
          sendLiveSignal({ arena: "call", kind: "hangup" });
          cleanup(false, "No contesta ahora mismo");
        }
      }, 45000);
    } catch (err) {
      cleanup(false, mediaErrorMessage(err));
    }
  }

  async function acceptCall() {
    setNotice(null);
    try {
      const icePromise = refreshIceServers();
      const { stream } = await ensureMedia();
      await icePromise;
      createPeer(stream);
      roleRef.current = "callee";
      setCallState("connecting");
      sendLiveSignal({ arena: "call", kind: "accept" });
    } catch (err) {
      sendLiveSignal({ arena: "call", kind: "decline" });
      cleanup(false, mediaErrorMessage(err));
    }
  }

  function declineCall() {
    sendLiveSignal({ arena: "call", kind: "decline" });
    cleanup(true);
  }

  function hangup() {
    sendLiveSignal({ arena: "call", kind: "hangup" });
    cleanup(false, "Llamada terminada");
  }

  function cleanup(silent: boolean, message?: string) {
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = null;
    stopOutgoingTimers();
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = null;
    stopRingtoneRef.current?.();
    stopRingtoneRef.current = null;
    if (buzzRef.current) clearInterval(buzzRef.current);
    buzzRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setPartnerSharingScreen(false);
    mediaModeRef.current = "full";
    setMediaMode("full");
    setLocalStream(null);
    setRemoteStream(null);
    pendingIceRef.current = [];
    roleRef.current = null;
    setMuted(false);
    setCameraOff(false);
    setElapsed(0);
    setSleeping(false);
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

  // --- compartir pantalla (it33-audit) ---
  //
  // Como Discord: no es "sincronizar Netflix", es retransmitir la pantalla
  // por la MISMA videollamada que ya existe. `replaceTrack` cambia el track
  // de vídeo que sale de la nave sin volver a negociar la conexión — el
  // resto del código de señalización (ofertas, ICE, reconexión) no se
  // entera de nada. Deliberadamente NO cubre el caso de una llamada que
  // empezó solo con audio: ahí no hay hueco de vídeo donde meter la pantalla
  // sin renegociar, y esa conexión ya tiene bastantes guardas delicadas como
  // para arriesgarlas por un caso de borde.
  function findVideoSender(): RTCRtpSender | null {
    return pcRef.current?.getSenders().find((s) => s.track?.kind === "video") ?? null;
  }

  function stopScreenShare(notifyPartner: boolean) {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    const camTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    if (camTrack) void findVideoSender()?.replaceTrack(camTrack);
    if (notifyPartner) {
      sendLiveSignal({ arena: "call", kind: "screen", data: JSON.stringify({ on: false }) });
    }
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopScreenShare(true);
      return;
    }
    if (mediaModeRef.current !== "full" || stateRef.current !== "active") return;
    const sender = findVideoSender();
    if (!sender) return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      await sender.replaceTrack(screenTrack);
      screenStreamRef.current = display;
      setScreenStream(display);
      sendLiveSignal({ arena: "call", kind: "screen", data: JSON.stringify({ on: true }) });
      // el botón nativo "dejar de compartir" del propio navegador también
      // tiene que volver a la cámara, no solo el botón de Near
      screenTrack.onended = () => stopScreenShare(true);
    } catch {
      // permiso denegado o ventana de selección cancelada: no pasa nada
    }
  }

  // --- modo dormir juntos ---
  function startSleep() {
    if (stateRef.current !== "active") return;
    setSleeping(true);
    sendLiveSignal({ arena: "call", kind: "sleep" });
  }

  function wakeUp() {
    setSleeping(false);
    sendLiveSignal({ arena: "call", kind: "wake" });
  }

  function goodnight() {
    sendLiveSignal({ arena: "call", kind: "goodnight" });
    heartbeat();
    sfx.goodnight();
    cleanup(false, "Buenas noches");
  }

  const value: CallContextValue = {
    state,
    muted,
    cameraOff,
    elapsed,
    notice,
    mediaMode,
    sleeping,
    partner,
    localStream,
    remoteStream,
    screenStream,
    partnerSharingScreen,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    startSleep,
    wakeUp,
    goodnight,
    clearNotice: () => setNotice(null)
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* el audio de la llamada vive aquí: navegar no lo corta */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <IncomingCallOverlay
        visible={state === "incoming"}
        partnerName={partner?.name ?? "Tu pareja"}
        onAccept={async () => {
          await acceptCall();
          router.push("/date-room");
        }}
        onDecline={declineCall}
      />
      <ActiveCallBar />
      <SleepOverlay
        visible={sleeping && state === "active"}
        partnerName={partner?.name ?? "tu pareja"}
        myTimezone={myTimezone}
        partnerTimezone={partnerTimezone}
        elapsed={elapsed}
        onWake={wakeUp}
        onGoodnight={goodnight}
      />
    </CallContext.Provider>
  );
}

// Reloj grande y tenue para el modo dormir. Sin dependencias: Intl directo.
function NightClock({ timezone, label }: { timezone: string | null; label: string }) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    if (!timezone) return;
    const tick = () => {
      try {
        setTime(
          new Intl.DateTimeFormat("es", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone
          }).format(new Date())
        );
      } catch {
        setTime(null);
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timezone]);

  return (
    <div className="text-center">
      <p className="font-display text-5xl tabular-nums text-white/90 sm:text-6xl">
        {time ?? "--:--"}
      </p>
      <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}

// Pantalla atenuada de "dormir juntos": la llamada de audio sigue abierta,
// los dos relojes presentes, y "Buenas noches" cierra con un latido.
function SleepOverlay({
  visible,
  partnerName,
  myTimezone,
  partnerTimezone,
  elapsed,
  onWake,
  onGoodnight
}: {
  visible: boolean;
  partnerName: string;
  myTimezone: string;
  partnerTimezone: string | null;
  elapsed: number;
  onWake: () => void;
  onGoodnight: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-10 bg-[#080510] px-6 text-white">
      <p className="flex items-center gap-2 text-sm text-white/50">
        <Moon className="h-4 w-4" />
        Durmiendo con {partnerName} · {Math.floor(elapsed / 60)}:
        {String(elapsed % 60).padStart(2, "0")}
      </p>

      <div className="flex items-center gap-10 sm:gap-16">
        <NightClock timezone={myTimezone} label="Tú" />
        <span className="h-16 w-px bg-white/10" />
        <NightClock timezone={partnerTimezone} label={partnerName} />
      </div>

      <p className="max-w-xs text-center text-sm text-white/40">
        Seguís conectados. Cerrad los ojos; el audio sigue abierto hasta que
        alguno diga buenas noches.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onWake}
          className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          <Sun className="h-4 w-4" /> Despertar
        </button>
        <button
          onClick={onGoodnight}
          className="flex items-center gap-2 rounded-full bg-rose px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-deep"
        >
          <Moon className="h-4 w-4" /> Buenas noches
        </button>
      </div>
    </div>
  );
}

// Overlay global de llamada entrante: aparece en cualquier página.
function IncomingCallOverlay({
  visible,
  partnerName,
  onAccept,
  onDecline
}: {
  visible: boolean;
  partnerName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-5">
      <div className="flex w-full max-w-md animate-fade-up items-center gap-3 rounded-3xl border border-rose/25 bg-paper px-4 py-3.5 shadow-lift">
        <span className="relative">
          <Avatar name={partnerName} size="md" tone={1} />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-white">
            <Phone className="h-3 w-3 animate-pulse" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{partnerName}</p>
          <p className="text-xs text-ink-soft">te está llamando…</p>
        </div>
        <Button size="sm" onClick={onAccept}>
          <Phone className="h-3.5 w-3.5" /> Aceptar
        </Button>
        <Button size="sm" variant="secondary" onClick={onDecline}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}

// Pildora flotante cuando hay llamada y NO estas en la sala: duracion,
// mute y colgar sin moverte, o volver a la sala para ver el video.
function ActiveCallBar() {
  const { state, muted, elapsed, partner, toggleMute, hangup } = useCall();
  const pathname = usePathname();
  const router = useRouter();

  const inCall = state === "outgoing" || state === "connecting" || state === "active";
  if (!inCall || pathname.startsWith("/date-room")) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      <div className="flex items-center gap-2 rounded-full border border-rose/25 bg-paper py-2 pl-4 pr-2 shadow-lift">
        <button
          onClick={() => router.push("/date-room")}
          className="flex items-center gap-2 text-left"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-ink">
            {state === "active"
              ? `${partner?.name ?? "En llamada"} · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
              : state === "outgoing"
                ? `Llamando a ${partner?.name ?? "tu pareja"}…`
                : "Conectando…"}
          </span>
        </button>
        <button
          onClick={toggleMute}
          className={cn(
            "rounded-full p-2 transition",
            muted ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-sand text-ink hover:bg-sand-deep"
          )}
          title={muted ? "Activar micro" : "Silenciar"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          onClick={hangup}
          className="rounded-full bg-red-500 p-2 text-white transition hover:bg-red-600"
          title="Colgar"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
