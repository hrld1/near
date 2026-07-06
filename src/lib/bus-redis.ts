import type { StreamEvent } from "@/types";

// Puente Redis para el bus de eventos: solo se activa si hay REDIS_URL. Permite
// que varias instancias (despliegue multi-nodo) compartan los eventos en vivo.
// Dormido por defecto: sin REDIS_URL, publish() es un no-op y el bus en memoria
// (lib/realtime.ts) funciona como siempre en un solo proceso.
//
// No añade dependencia obligatoria: ioredis se carga con un import dinámico de
// especificador calculado (webpack no lo empaqueta) y, si no está instalado, se
// avisa y se sigue con el bus en memoria. Para multi-nodo real: `npm i ioredis`
// y define REDIS_URL.

type Remote = (coupleId: string, event: StreamEvent) => void;

type RedisLike = {
  publish(channel: string, message: string): unknown;
  subscribe(channel: string): unknown;
  on(event: "message", cb: (channel: string, message: string) => void): unknown;
  duplicate(): RedisLike;
};

const CHANNEL = "near:bus";
// id de esta instancia: para ignorar el eco de nuestros propios mensajes (ya
// entregados en local por publish()).
const originId = Math.random().toString(36).slice(2);

export type BusBridge = { publish: (coupleId: string, event: StreamEvent) => void };

export function createBusBridge(onRemote: Remote): BusBridge {
  const url = process.env.REDIS_URL;
  if (!url) return { publish: () => {} };

  let pub: RedisLike | null = null;

  void (async () => {
    try {
      // especificador calculado: evita que el bundler exija el módulo en build
      const moduleName = ["io", "redis"].join("");
      const mod = (await import(/* webpackIgnore: true */ moduleName)) as {
        default: new (connection: string) => RedisLike;
      };
      const Redis = mod.default;
      pub = new Redis(url);
      const sub = pub.duplicate();
      sub.subscribe(CHANNEL);
      sub.on("message", (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as {
            originId: string;
            coupleId: string;
            event: StreamEvent;
          };
          if (parsed.originId === originId) return; // eco propio
          onRemote(parsed.coupleId, parsed.event);
        } catch {
          // mensaje mal formado: se ignora
        }
      });
    } catch (err) {
      console.warn(
        "[near] REDIS_URL definido pero no se pudo cargar ioredis; el bus sigue en memoria (single-node).",
        err
      );
    }
  })();

  return {
    publish(coupleId, event) {
      pub?.publish(CHANNEL, JSON.stringify({ originId, coupleId, event }));
    }
  };
}
