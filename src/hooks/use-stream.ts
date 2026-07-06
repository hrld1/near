"use client";

import { useEffect, useRef } from "react";
import type { StreamEvent } from "@/types";

type Handler = (event: StreamEvent) => void;

// UNA sola conexión SSE por pestaña, compartida por todos los que escuchan.
// Antes cada useCoupleStream abria su propio EventSource: con varias piezas en
// pantalla (chat, presencia, llamada, tacto, refrescos...) se rozaba el limite
// de ~6 conexiones por host de HTTP/1.1 y se bloqueaban peticiones. Ahora hay
// un unico EventSource con fan-out a los listeners y conteo de referencias.
let source: EventSource | null = null;
const listeners = new Set<Handler>();

function ensureSource() {
  if (source || typeof window === "undefined") return;
  source = new EventSource("/api/stream");
  source.onmessage = (message) => {
    let event: StreamEvent;
    try {
      event = JSON.parse(message.data) as StreamEvent;
    } catch {
      return; // evento malformado: ignorar
    }
    if (event.type === "ping" || event.type === "connected") return;
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // un listener roto no debe cortar el reparto al resto
      }
    }
  };
}

export function useCoupleStream(onEvent: Handler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const handler: Handler = (event) => handlerRef.current(event);
    listeners.add(handler);
    ensureSource();
    return () => {
      listeners.delete(handler);
      // sin nadie escuchando, cerramos; el layout mantiene listeners vivos
      // durante la navegacion, así que esto solo ocurre al cerrar la app
      if (listeners.size === 0 && source) {
        source.close();
        source = null;
      }
    };
  }, []);
}
