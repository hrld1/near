import type { StreamEvent } from "@/types";

// Bus de eventos en memoria para SSE.
// Valido para un solo proceso (dev / single node). Para produccion
// multi-instancia, sustituir por Redis pub/sub o un servicio tipo Pusher:
// la interfaz publish/subscribe se mantiene igual.

type Listener = (event: StreamEvent) => void;

const globalForBus = globalThis as unknown as {
  nearBus?: Map<string, Set<Listener>>;
  nearOnline?: Map<string, number>;
};

const bus = (globalForBus.nearBus ??= new Map<string, Set<Listener>>());

// Conexiones SSE vivas por usuario: si tiene alguna, esta "online" y no
// hace falta push. Misma limitacion single-process que el bus (con varias
// instancias, esto también iria a Redis).
const online = (globalForBus.nearOnline ??= new Map<string, number>());

export function trackOnline(userId: string): () => void {
  online.set(userId, (online.get(userId) ?? 0) + 1);
  return () => {
    const next = (online.get(userId) ?? 1) - 1;
    if (next <= 0) online.delete(userId);
    else online.set(userId, next);
  };
}

export function isUserOnline(userId: string) {
  return (online.get(userId) ?? 0) > 0;
}

export function subscribe(coupleId: string, listener: Listener): () => void {
  let set = bus.get(coupleId);
  if (!set) {
    set = new Set();
    bus.set(coupleId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) bus.delete(coupleId);
  };
}

export function publish(coupleId: string, event: StreamEvent) {
  const set = bus.get(coupleId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event);
    } catch {
      // listener roto: se limpia al cerrar la conexión
    }
  }
}
