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

// `onerror` NO basta para saber que estás desconectado. Medido: con la red
// cortada, una conexión SSE ya abierta se queda en readyState=1 sin disparar
// un solo error — el socket no se entera de que no hay red hasta que intenta
// hablar y agota el tiempo, y eso puede tardar minutos. O sea que detectaba el
// reinicio del servidor pero no el metro, ni el wifi que se cae, ni el móvil
// que se duerme.
//
// Por eso hay tres señales: el error (cuando llega), los eventos de red del
// navegador, y sobre todo un vigía sobre el latido del servidor — si lleva
// demasiado en silencio, la conexión está muerta aunque diga estar viva.
const LATIDO_MS = 25_000; // el servidor manda "ping" a este ritmo
const SILENCIO_MAX_MS = LATIDO_MS * 2 + 10_000;
let lastMessageAt = 0;
let watchdog: ReturnType<typeof setInterval> | null = null;
let netListenersReady = false;

function setStatus(next: StreamStatus) {
  if (status === next) return;
  status = next;
  for (const listener of statusListeners) listener(next);
}

// Cierra lo que haya y vuelve a abrir ya, sin esperar la cuenta atrás.
function reopen() {
  if (typeof window === "undefined") return;
  if (source) {
    source.close();
    source = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  setStatus("reconnecting");
  if (listeners.size > 0) ensureSource();
}

function ensureNetListeners() {
  if (netListenersReady || typeof window === "undefined") return;
  netListenersReady = true;

  // La red se fue: no hace falta esperar al vigía para saberlo.
  window.addEventListener("offline", () => setStatus("reconnecting"));
  // La red volvió: reabrir en el acto, sin respetar la espera creciente.
  window.addEventListener("online", () => {
    retryMs = 1000;
    if (listeners.size > 0) reopen();
  });
  // Volver a la app tras un rato (móvil desbloqueado, pestaña al frente) es el
  // momento típico en que arrastras una conexión zombi.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (listeners.size === 0) return;
    if (Date.now() - lastMessageAt > SILENCIO_MAX_MS) reopen();
  });
}

function startWatchdog() {
  if (watchdog) return;
  watchdog = setInterval(() => {
    if (listeners.size === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("reconnecting");
      return;
    }
    // Demasiado silencio: el servidor late cada 25 s, así que si no llega nada
    // en más de un minuto la conexión está muerta por mucho que lo niegue.
    if (lastMessageAt > 0 && Date.now() - lastMessageAt > SILENCIO_MAX_MS) reopen();
  }, 5000);
}

function ensureSource() {
  if (source || typeof window === "undefined") return;
  ensureNetListeners();
  startWatchdog();
  const es = new EventSource("/api/stream");
  source = es;
  lastMessageAt = Date.now(); // margen para el primer latido

  es.onopen = () => {
    retryMs = 1000;
    lastMessageAt = Date.now();
    // Solo es una RE-conexión si ya habíamos estado caídos; la primera vez no
    // hay nada que resincronizar.
    const wasDown = status === "reconnecting";
    setStatus("online");
    if (wasDown) for (const listener of reconnectListeners) listener();
  };

  es.onmessage = (message) => {
    // Cualquier cosa que llegue, incluido el latido, prueba que sigue viva.
    lastMessageAt = Date.now();
    if (status !== "online") setStatus("online");
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
  if (listeners.size > 0) return;
  if (source) {
    source.close();
    source = null;
  }
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (watchdog) clearInterval(watchdog);
  watchdog = null;
  retryMs = 1000;
  lastMessageAt = 0;
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
