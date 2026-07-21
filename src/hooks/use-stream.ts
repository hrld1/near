"use client";

import { useEffect, useRef, useState } from "react";
import type { StreamEvent } from "@/types";

type Handler = (event: StreamEvent) => void;
export type StreamStatus = "connecting" | "online" | "reconnecting";

// UNA sola conexión SSE por pestaña, compartida por todos los que escuchan.
// Antes cada useCoupleStream abria su propio EventSource: con varias piezas en
// pantalla (chat, presencia, llamada, tacto, refrescos...) se rozaba el limite
// de ~6 conexiones por host de HTTP/1.1 y se bloqueaban peticiones. Ahora hay
// un unico EventSource con fan-out a los listeners y conteo de referencias.
let source: EventSource | null = null;
const listeners = new Set<Handler>();

// Estado de la conexión (it32). El bus NO guarda historial: lo que se publica
// mientras estás desconectado se pierde para siempre. Antes el cliente no se
// enteraba siquiera de que se había caído — seguía enseñando lo último que vio,
// con toda la apariencia de estar al día. Ahora se sabe, se avisa, y al volver
// se vuelve a pedir el estado al servidor en vez de confiar en no haberse
// perdido nada.
let status: StreamStatus = "connecting";
const statusListeners = new Set<(next: StreamStatus) => void>();
const reconnectListeners = new Set<() => void>();

// Espera creciente para el caso en que el navegador se rinde (readyState
// CLOSED): 1s, 2s, 4s... hasta 30s. El EventSource nativo reintenta solo
// mientras puede, así que esto es solo la red de seguridad.
let retryMs = 1000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function setStatus(next: StreamStatus) {
  if (status === next) return;
  status = next;
  for (const listener of statusListeners) listener(next);
}

function ensureSource() {
  if (source || typeof window === "undefined") return;
  const es = new EventSource("/api/stream");
  source = es;

  es.onopen = () => {
    retryMs = 1000;
    // Solo es una RE-conexión si ya habíamos estado caídos; la primera vez no
    // hay nada que resincronizar.
    const wasDown = status === "reconnecting";
    setStatus("online");
    if (wasDown) for (const listener of reconnectListeners) listener();
  };

  es.onmessage = (message) => {
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

  es.onerror = () => {
    if (source !== es) return; // conexión vieja agonizando: ignorar
    setStatus("reconnecting");
    // CLOSED = el navegador no va a reintentar solo (pasa, por ejemplo, si el
    // servidor se reinicia en mitad del despliegue). Reabrimos nosotros.
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      source = null;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (listeners.size > 0) ensureSource();
      }, retryMs);
      retryMs = Math.min(retryMs * 2, 30_000);
    }
  };
}

function teardownIfIdle() {
  if (listeners.size > 0 || !source) return;
  source.close();
  source = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryMs = 1000;
  setStatus("connecting");
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
      teardownIfIdle();
    };
  }, []);
}

// Estado de la conexión, para avisar en pantalla.
export function useStreamStatus(): StreamStatus {
  const [value, setValue] = useState<StreamStatus>(status);
  useEffect(() => {
    setValue(status);
    statusListeners.add(setValue);
    return () => {
      statusListeners.delete(setValue);
    };
  }, []);
  return value;
}

// Se dispara al RECUPERAR la conexión: momento de volver a pedir los datos.
export function useStreamReconnect(onReconnect: () => void) {
  const ref = useRef(onReconnect);
  ref.current = onReconnect;
  useEffect(() => {
    const listener = () => ref.current();
    reconnectListeners.add(listener);
    return () => {
      reconnectListeners.delete(listener);
    };
  }, []);
}
