"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useCoupleStream } from "@/hooks/use-stream";
import type { StreamEventType } from "@/types";

// Refresca los datos de servidor de la página cuando llegan eventos
// relevantes de la pareja. Throttle de 1.5s con BORDE DE SALIDA: un evento
// dentro de la ventana no se descarta, se programa un refresco al cerrarla
// (descartarlo dejaba la vista desactualizada para siempre si era el último;
// lo cazó el harness E2E de it26 en Coincidir).
export function LiveRefresh({ types }: { types?: StreamEventType[] }) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useCoupleStream((event) => {
    if (types && !(types as string[]).includes(event.type)) return;
    const elapsed = Date.now() - lastRefresh.current;
    if (elapsed >= 1500) {
      lastRefresh.current = Date.now();
      router.refresh();
    } else if (!trailing.current) {
      trailing.current = setTimeout(() => {
        trailing.current = null;
        lastRefresh.current = Date.now();
        router.refresh();
      }, 1500 - elapsed);
    }
  });

  return null;
}
