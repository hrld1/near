"use client";

import { useEffect, useState } from "react";
import { Heart, Share, SquarePlus, X } from "lucide-react";

// Invitación a instalar Near en la pantalla de inicio (it45). Casi nadie
// descubre solo el "añadir a pantalla de inicio", y es justo el gesto que
// convierte Near en algo de un toque cada día. Dos caminos:
//   · Android / Chrome / escritorio → captura beforeinstallprompt y ofrece
//     el botón nativo de instalar.
//   · iOS Safari → ese evento no existe, así que se muestran las instrucciones
//     (Compartir → Añadir a pantalla de inicio).
// No aparece si ya está instalada (display-mode: standalone), y si la cierras
// no vuelve a molestar en 30 días.

const DISMISS_KEY = "near-install-dismissed";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

type Choice = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<Choice | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || dismissedRecently()) return;

    // Android / Chrome / escritorio: el navegador nos deja disparar el instalar
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as unknown as Choice);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS: no hay evento; si es Safari y no está instalada, mostramos el cómo.
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari) {
      // un respiro para no saltar nada más entrar
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
    }

    // si se instala mientras la app está abierta, quitamos la invitación
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function close() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // sin localStorage: se cierra solo por esta sesión
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // el usuario canceló el diálogo del navegador: sin ruido
    }
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-sm animate-fade-up md:inset-x-auto md:right-4 md:bottom-4">
      <div className="glass flex items-start gap-3 rounded-3xl p-4 shadow-lift">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
          <Heart className="h-5 w-5 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight text-ink">Ten Near a un toque</p>
          {iosHint ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-ink-soft">
              Toca <Share className="inline h-4 w-4 text-rose" /> Compartir y luego{" "}
              <SquarePlus className="inline h-4 w-4 text-rose" /> Añadir a pantalla de inicio.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Instálalo en tu pantalla de inicio: abre al instante y os avisa cuando pasa algo.
              </p>
              <button
                onClick={() => void install()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose to-rose-deep px-4 py-2 text-sm font-medium text-white shadow-card transition hover:brightness-105 active:scale-95"
              >
                <SquarePlus className="h-4 w-4" /> Instalar Near
              </button>
            </>
          )}
        </div>
        <button
          onClick={close}
          aria-label="Ahora no"
          className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-sand hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
