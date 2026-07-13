// Limitador de intentos de login (el "cerrojo" de la auditoría nº 3).
// Puro y testeable: el reloj se inyecta. En memoria por proceso — igual que
// el bus SSE: suficiente en single-node; con múltiples instancias habría que
// llevarlo a Redis (mismo camino que lib/bus-redis).
//
// Regla: 5 fallos seguidos por identidad (email) → bloqueo con enfriamiento
// exponencial: 1 min, 2, 4... hasta 15 min. Un login correcto lo resetea.

export const LOGIN_MAX_ATTEMPTS = 5;
const BASE_COOLDOWN_MS = 60_000; // 1 min
const MAX_COOLDOWN_MS = 15 * 60_000; // 15 min
const FORGET_AFTER_MS = 60 * 60_000; // fallos antiguos (1 h) se olvidan

type Entry = { fails: number; blockedUntil: number; lastFailAt: number };

export function createLoginLimiter(now: () => number = Date.now) {
  const entries = new Map<string, Entry>();

  function get(key: string): Entry | null {
    const e = entries.get(key);
    if (!e) return null;
    if (now() - e.lastFailAt > FORGET_AFTER_MS) {
      entries.delete(key);
      return null;
    }
    return e;
  }

  return {
    // ¿está bloqueado ahora mismo? (ms restantes, o 0)
    blockedFor(key: string): number {
      const e = get(key);
      if (!e) return 0;
      return Math.max(0, e.blockedUntil - now());
    },
    // registra un fallo; devuelve ms de bloqueo si este fallo lo activa
    fail(key: string): number {
      const e = get(key) ?? { fails: 0, blockedUntil: 0, lastFailAt: 0 };
      e.fails += 1;
      e.lastFailAt = now();
      if (e.fails >= LOGIN_MAX_ATTEMPTS) {
        const over = e.fails - LOGIN_MAX_ATTEMPTS;
        const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** over, MAX_COOLDOWN_MS);
        e.blockedUntil = now() + cooldown;
      }
      entries.set(key, e);
      return Math.max(0, e.blockedUntil - now());
    },
    ok(key: string) {
      entries.delete(key);
    }
  };
}

// instancia global del proceso (una por servidor, como el bus)
export const loginLimiter = createLoginLimiter();
