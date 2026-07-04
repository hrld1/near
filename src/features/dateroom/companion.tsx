"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Pause, Play, Popcorn } from "lucide-react";
import { companionSignalAction, setRoomModeAction } from "@/actions/dateroom";
import { useCoupleStream } from "@/hooks/use-stream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Modo companion HONESTO para Netflix / HBO / Prime / Disney+ / Spotify:
// sus APIs no permiten controlar la reproduccion desde una web externa,
// asi que Near no lo finge. Lo que si hace de verdad: coordinar la sesion
// (misma peli/lista), estado de "listo", cuenta atras sincronizada para dar
// al play a la vez y senales de pausa/reanudar en tiempo real.

const PLATFORMS = [
  { key: "NETFLIX", label: "Netflix" },
  { key: "HBO", label: "HBO Max" },
  { key: "PRIME", label: "Prime Video" },
  { key: "DISNEY", label: "Disney+" },
  { key: "SPOTIFY", label: "Spotify" },
  { key: "OTRO", label: "Otra" }
];

export function CompanionRoom({
  myId,
  partnerName,
  initialPlatform,
  initialTitle
}: {
  myId: string;
  partnerName: string;
  initialPlatform: string | null;
  initialTitle: string | null;
}) {
  const [platform, setPlatform] = useState(initialPlatform ?? "NETFLIX");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [saved, setSaved] = useState(!!initialPlatform);
  const [meReady, setMeReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useCoupleStream((event) => {
    if (event.type === "room:mode") {
      const payload = event.payload;
      if (payload.byId === myId) return;
      if (payload.mode === "COMPANION") {
        setPlatform(payload.platform ?? "NETFLIX");
        setTitle(payload.sessionTitle ?? "");
        setSaved(true);
        setMeReady(false);
        setPartnerReady(false);
      }
    }
    if (event.type === "companion:signal") {
      const payload = event.payload;
      const own = payload.byId === myId;
      if (payload.kind === "ready" && !own) {
        setPartnerReady(true);
        setBanner(`${payload.byName} ya esta en el sofa`);
      }
      if (payload.kind === "go") startCountdown();
      if (payload.kind === "pause" && !own) setBanner(`${payload.byName} ha pausado. Espera...`);
      if (payload.kind === "resume" && !own) setBanner(`${payload.byName} le ha dado al play`);
    }
  });

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  function startCountdown() {
    setCountdown(3);
    let n = 3;
    const interval = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(interval);
        setCountdown(0);
        setTimeout(() => setCountdown(null), 1600);
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  function saveSession() {
    startTransition(async () => {
      await setRoomModeAction({ mode: "COMPANION", platform, sessionTitle: title });
      setSaved(true);
    });
  }

  function signal(kind: "ready" | "go" | "pause" | "resume") {
    if (kind === "ready") setMeReady(true);
    startTransition(async () => {
      await companionSignalAction(kind);
    });
  }

  const platformLabel = PLATFORMS.find((p) => p.key === platform)?.label ?? platform;

  return (
    <div className="relative flex min-h-[300px] flex-col gap-4 rounded-2xl border border-sand bg-paper p-5 shadow-card">
      {countdown !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm">
          <p className="animate-pop-in font-display text-7xl text-white" key={countdown}>
            {countdown === 0 ? "PLAY ▶" : countdown}
          </p>
        </div>
      )}

      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-soft">
          <Popcorn className="h-4 w-4" /> Sesion companion
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Netflix, HBO y compania no permiten que una web externa controle su
          reproduccion, y no vamos a fingirlo. Esto si es real: elegid que ver,
          marcaos como listos y dad al play exactamente a la vez.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPlatform(p.key);
              setSaved(false);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              platform === p.key
                ? "border-rose bg-rose-faint text-rose-deep"
                : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
          maxLength={120}
          placeholder="Que vais a ver/escuchar? (ej. 'Dark, S01E03')"
        />
        <Button onClick={saveSession} loading={pending} disabled={saved}>
          {saved ? "Guardado" : "Fijar plan"}
        </Button>
      </div>

      {saved && (
        <div className="rounded-xl bg-sand px-4 py-3 text-sm text-ink">
          Plan de hoy: <b>{title || "sesion sorpresa"}</b> en <b>{platformLabel}</b>.
          Abridlo cada uno en su pantalla y usad los botones de abajo.
        </div>
      )}

      <div className="mt-auto space-y-2.5">
        {banner && (
          <p className="animate-fade-up rounded-xl bg-rose-faint px-4 py-2.5 text-sm font-medium text-rose-deep">
            {banner}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={meReady ? "secondary" : "primary"}
            size="sm"
            disabled={meReady}
            onClick={() => signal("ready")}
          >
            <CheckCircle2 className="h-4 w-4" />
            {meReady ? "Lista/o ✓" : "Estoy lista/o"}
          </Button>
          <Button
            size="sm"
            variant={meReady && partnerReady ? "primary" : "secondary"}
            onClick={() => signal("go")}
          >
            <Play className="h-4 w-4" /> 3, 2, 1... ¡Play!
          </Button>
          <Button size="sm" variant="ghost" onClick={() => signal("pause")}>
            <Pause className="h-4 w-4" /> He pausado
          </Button>
          <Button size="sm" variant="ghost" onClick={() => signal("resume")}>
            <Play className="h-4 w-4" /> Sigo
          </Button>
          <span className="ml-auto text-xs text-ink-soft">
            {partnerReady ? `${partnerName} esta lista/o ✓` : `${partnerName} aun no esta lista/o`}
          </span>
        </div>
      </div>
    </div>
  );
}
