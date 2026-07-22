"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Envoltorio de pantalla completa para CUALQUIER juego (it33-audit): en un
// monitor ancho, el canvas se queda atrapado en el ancho de la tarjeta —
// aquí está el botón para que crezca de verdad. Un solo componente en vez de
// tocar 19 archivos; el CSS de `:fullscreen canvas` en globals.css hace el
// resto sin que cada juego sepa que existe.
export function FullscreenStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof document !== "undefined" && !!document.documentElement.requestFullscreen);
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      // Puede fallar si el navegador lo bloquea (iframes, permisos): el botón
      // simplemente no hace nada visible, no rompe el juego.
      void ref.current?.requestFullscreen().catch(() => {});
    }
  }

  if (!supported) return <>{children}</>;

  return (
    <div
      ref={ref}
      className={cn("relative", isFullscreen && "flex h-full items-center justify-center bg-[#0a0714] p-4")}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      {children}
    </div>
  );
}
