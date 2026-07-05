"use client";

import { useEffect, useState } from "react";
import { Vibrate, Volume2 } from "lucide-react";
import { hapticsOn, heartbeat, setHapticsOn, setSoundOn, sfx, soundOn } from "@/lib/sound";
import { cn } from "@/lib/utils";

// Sonido y vibración de ESTE dispositivo (localStorage, como el push).
// Al activar cada uno se reproduce una muestra: el ajuste se siente al tocarlo.
export function SoundToggle() {
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSound(soundOn());
    setHaptics(hapticsOn());
    setReady(true);
  }, []);

  if (!ready) return <p className="text-sm text-ink-soft">Comprobando este dispositivo…</p>;

  function toggleSound() {
    const next = !sound;
    setSoundOn(next);
    setSound(next);
    if (next) sfx.pulse();
  }

  function toggleHaptics() {
    const next = !haptics;
    setHapticsOn(next);
    setHaptics(next);
    if (next) heartbeat();
  }

  const row =
    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-sand";

  return (
    <div className="space-y-1">
      <button type="button" onClick={toggleSound} className={row}>
        <span className="flex items-center gap-2.5 text-sm text-ink">
          <Volume2 className="h-4 w-4 text-rose" />
          Sonidos (mensajes, latidos, llamada, juegos)
        </span>
        <Switch on={sound} />
      </button>
      <button type="button" onClick={toggleHaptics} className={row}>
        <span className="flex items-center gap-2.5 text-sm text-ink">
          <Vibrate className="h-4 w-4 text-rose" />
          Vibración (latido al recibir un “pensando en ti”)
        </span>
        <Switch on={haptics} />
      </button>
      <p className="px-3 pt-1 text-xs text-ink-soft">
        Solo afecta a este dispositivo. La vibración depende del navegador (en
        iPhone no está disponible).
      </p>
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition",
        on ? "bg-rose" : "bg-sand-deep"
      )}
      aria-hidden
    >
      <span
        className={cn(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition",
          on ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </span>
  );
}
