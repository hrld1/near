"use client";

import { useEffect } from "react";

// Insignia en el icono de la app instalada (it45): un número sobre el icono de
// Near en la pantalla de inicio con lo que te espera, sin abrir nada — lo más
// parecido a un widget que permite una PWA. Usa la Badging API, disponible en
// PWA instalada (Android, iOS 16.4+, escritorio Chrome/Edge). En el navegador
// normal no hace nada: cada llamada va en try/catch y degrada en silencio.
//
// El recuento se recalcula en el servidor en cada navegación/refresco, y Near
// ya refresca el layout al llegar un mensaje (LiveRefresh message:new), así que
// la insignia se mantiene al día sola.
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    try {
      if (count > 0) void nav.setAppBadge(count);
      else void nav.clearAppBadge?.();
    } catch {
      // navegador sin soporte real: sin ruido
    }
  }, [count]);

  return null;
}
