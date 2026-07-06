import type { StreamEvent } from "@/types";
import { createBusBridge } from "@/lib/bus-redis";

// Bus de eventos para SSE. Por defecto vive en memoria (un solo proceso: dev o
// single-node). En multi-nodo, el puente Redis (lib/bus-redis, activo solo con
// REDIS_URL) reparte los eventos entre instancias; la interfaz publish/
// subscribe no cambia. El seguimiento de "online" es local (best-effort): con
// varias instancias, un push de más a alguien conectado en otro nodo es
// inofensivo.

type Listener = (event: StreamEvent) => void;

const globalForBus = globalThis as unknown as {
  nearBus?: Map<string, Set<Listener>>;
  nearOnline?: Map<string, number>;
};

const bus = (globalForBus.nearBus ??= new Map<string, Set<Listener>>());

// Puente a otras instancias: al recibir un evento de otro nodo, se entrega solo
// a los oyentes locales (sin reenviarlo, para no crear bucles).
const bridge = createBusBridge((coupleId, event) => deliverLocal(coupleId, event));

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

// Entrega a los oyentes de ESTA instancia. Lo usa publish() y el puente Redis
// cuando llega un evento de otro nodo.
function deliverLocal(coupleId: string, event: StreamEvent) {
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

export function publish(coupleId: string, event: StreamEvent) {
  deliverLocal(coupleId, event);
  // reenvía a otras instancias (no-op sin REDIS_URL)
  bridge.publish(coupleId, event);
}
