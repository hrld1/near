"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { useCoupleStream, useStreamReconnect, useStreamStatus } from "@/hooks/use-stream";

// Aviso de conexión perdida + resincronización al volver (it32).
//
// El bus de eventos no guarda historial: lo publicado mientras estás
// desconectado no se recupera. Y como cada push a main redespliega, el
// servidor se reinicia con gente dentro. Antes eso era invisible — la app
// seguía enseñando lo último que vio, aparentando estar al día.
//
// Dos cosas, entonces: decirlo, y al recuperar la conexión volver a pedir los
// datos al servidor. La verdad está en la base de datos, no en el bus.
const GRACIA_MS = 2500;

export function LiveConnection() {
  const router = useRouter();
  const status = useStreamStatus();
  const [visible, setVisible] = useState(false);

  // Mantiene viva la conexión compartida aunque ninguna otra pieza escuche.
  useCoupleStream(() => {});

  useStreamReconnect(() => {
    router.refresh();
  });

  // Un parpadeo de un segundo no merece un cartel: solo se avisa si la caída
  // dura de verdad.
  useEffect(() => {
    if (status !== "reconnecting") {
      setVisible(false);
      return;
    }
    const id = setTimeout(() => setVisible(true), GRACIA_MS);
    return () => clearTimeout(id);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4 motion-safe:animate-fade-up"
    >
      <p className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink shadow-glow">
        <WifiOff className="h-4 w-4 shrink-0 text-ink-soft" />
        Reconectando…
      </p>
    </div>
  );
}
