// Canal de señales en vivo de los duelos, fuera de las server actions (it31).
//
// Dos problemas distintos que comparten solución:
//
// 1. Next.js serializa las server actions y encola las navegaciones detrás de
//    ellas. El marcador se manda cada 200 ms; con latencia real cada llamada
//    tarda más que el propio intervalo, la cola crece sin parar y cambiar de
//    página llegaba a tardar 14 segundos (medido contra el despliegue). Un
//    fetch normal no entra en esa cola.
//
// 2. El abandono se manda al desmontarse el componente, o sea justo mientras
//    el navegador navega a otra parte, y ahí cancela las peticiones en vuelo.
//    `sendBeacon` encola la petición en el navegador y la entrega aunque la
//    página ya no exista.
type LiveSignal =
  | { arena: "race"; game: string; kind: "score" | "done"; score: number }
  | { arena: "race"; game: string; kind: "quit" }
  | { arena: "duel"; game: string; kind: "quit" };

// El marcador es un flujo continuo: si una petición sigue en vuelo no tiene
// sentido apilar la siguiente — el valor nuevo ya sustituye al viejo. Así el
// canal se autolimita si la red se pone lenta, en vez de acumular retraso.
let inFlight = false;

export function sendLiveSignal(signal: LiveSignal) {
  if (typeof fetch === "undefined") return;
  if (signal.kind === "score") {
    if (inFlight) return;
    inFlight = true;
  }
  void fetch("/api/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signal)
  })
    .catch(() => {})
    .finally(() => {
      if (signal.kind === "score") inFlight = false;
    });
}

// Abandono: la página se está muriendo, así que va por beacon.
export function sendQuitBeacon(arena: "race" | "duel", game: string) {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify({ arena, game, kind: "quit" });

  if (typeof navigator.sendBeacon === "function") {
    // El tipo importa: con Blob se manda tal cual y el servidor lo lee como
    // JSON. Devuelve false si el navegador rechaza encolarlo (cuota), en cuyo
    // caso probamos igualmente con fetch.
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/live", blob)) return;
  }

  // Reserva para navegadores sin sendBeacon: `keepalive` da la misma garantía
  // de supervivencia a la petición.
  void fetch("/api/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}
