"use client";

// Capa de sonido y háptica de Near. Sin assets: todos los sonidos se
// sintetizan con WebAudio (unos pocos osciladores con envolvente), así que
// pesan cero bytes y suenan igual en todas las plataformas.
//
// Reglas:
// - Preferencias por dispositivo en localStorage (como el push): sonido y
//   vibración se pueden apagar por separado en Ajustes.
// - El AudioContext se crea/desbloquea en el primer gesto del usuario
//   (política de autoplay). Si aún no hay gesto, los sonidos se omiten en
//   silencio: nunca rompen nada.
// - navigator.vibrate no existe en iOS Safari: la vibración es progresiva.

const PREF_SOUND = "near:sound";
const PREF_HAPTICS = "near:haptics";

function readPref(key: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key) !== "off";
}

export function soundOn() {
  return readPref(PREF_SOUND);
}
export function setSoundOn(value: boolean) {
  window.localStorage.setItem(PREF_SOUND, value ? "on" : "off");
}
export function hapticsOn() {
  return readPref(PREF_HAPTICS);
}
export function setHapticsOn(value: boolean) {
  window.localStorage.setItem(PREF_HAPTICS, value ? "on" : "off");
}

// ---- háptica ----

export function vibrate(pattern: number | number[]) {
  if (!hapticsOn()) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // algunos navegadores lanzan si la pestaña no está activa
  }
}

// Un latido: golpe fuerte, pausa corta, golpe suave (lub-dub).
export function heartbeat() {
  vibrate([45, 90, 60]);
}

// ---- audio ----

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

// Desbloqueo con el primer gesto (los navegadores exigen interacción).
if (typeof window !== "undefined") {
  const unlock = () => ensureCtx();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

type ToneOpts = {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
};

function tone(
  c: AudioContext,
  { freq, at = 0, dur = 0.18, type = "sine", gain = 0.08, glideTo }: ToneOpts
) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function play(fn: (c: AudioContext) => void) {
  if (!soundOn()) return;
  const c = ensureCtx();
  if (!c || c.state !== "running") return;
  fn(c);
}

export const sfx = {
  // pop suave al recibir mensaje
  message() {
    play((c) => {
      tone(c, { freq: 720, glideTo: 960, dur: 0.09, gain: 0.05 });
      tone(c, { freq: 1080, at: 0.06, dur: 0.08, gain: 0.035 });
    });
  },
  // latido audible (nudge, beso de pulgar)
  pulse() {
    play((c) => {
      tone(c, { freq: 150, dur: 0.12, gain: 0.16 });
      tone(c, { freq: 118, at: 0.16, dur: 0.16, gain: 0.12 });
    });
  },
  // tono por pad del juego Eco (do-mi-sol-do, tipo Simon)
  pad(i: number) {
    const notes = [392, 523.25, 659.25, 783.99];
    play((c) => tone(c, { freq: notes[i % 4], type: "triangle", dur: 0.22, gain: 0.07 }));
  },
  // arpegio ascendente: logro, victoria, misión
  success() {
    play((c) => {
      tone(c, { freq: 523.25, type: "triangle", dur: 0.14, gain: 0.06 });
      tone(c, { freq: 659.25, at: 0.09, type: "triangle", dur: 0.14, gain: 0.06 });
      tone(c, { freq: 783.99, at: 0.18, type: "triangle", dur: 0.24, gain: 0.07 });
    });
  },
  // tres notas descendentes, lentas: buenas noches
  goodnight() {
    play((c) => {
      tone(c, { freq: 783.99, dur: 0.32, gain: 0.05 });
      tone(c, { freq: 659.25, at: 0.24, dur: 0.32, gain: 0.05 });
      tone(c, { freq: 523.25, at: 0.48, dur: 0.5, gain: 0.055 });
    });
  },
  // campanita doble en bucle mientras suena la llamada; devuelve stop()
  startRing(): () => void {
    const ringOnce = () =>
      play((c) => {
        tone(c, { freq: 880, type: "triangle", dur: 0.35, gain: 0.07 });
        tone(c, { freq: 1108.73, at: 0.18, type: "triangle", dur: 0.45, gain: 0.06 });
      });
    ringOnce();
    const id = window.setInterval(ringOnce, 2200);
    return () => window.clearInterval(id);
  }
};
