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
export type CallSignalKind =
  | "ring"
  | "accept"
  | "decline"
  | "offer"
  | "answer"
  | "ice"
  | "hangup"
  | "sleep"
  | "wake"
  | "goodnight"
  | "screen";

type LiveSignal =
  | { arena: "race"; game: string; kind: "score" | "done"; score: number }
  | { arena: "race"; game: string; kind: "quit" }
  | { arena: "duel"; game: string; kind: "quit" }
  | { arena: "call"; kind: CallSignalKind; data?: string; initial?: boolean }
  | { arena: "touch"; kind: "join" | "leave" | "move"; x?: number; y?: number; pressing?: boolean }
  | { arena: "together"; here: boolean };

// El marcador es un flujo continuo: si una petición sigue en vuelo no tiene
// sentido apilar la siguiente — el valor nuevo ya sustituye al viejo. Así el
// canal se autolimita si la red se pone lenta, en vez de acumular retraso.
// Por arena, no global: que el marcador de un duelo esté en vuelo no debe
// silenciar el dedo en la superficie de tacto.
const inFlight = new Set<string>();

// ¿Es un flujo continuo del que solo importa el último valor? El marcador de
// un duelo y la posición del dedo lo son; todo lo demás (empezar, terminar,
// colgar) tiene que llegar sí o sí.
function isStream(signal: LiveSignal) {
  return (
    (signal.arena === "race" && signal.kind === "score") ||
    (signal.arena === "touch" && signal.kind === "move")
  );
}

export function sendLiveSignal(signal: LiveSignal) {
  if (typeof fetch === "undefined") return;
  const stream = isStream(signal);
  if (stream) {
    if (inFlight.has(signal.arena)) return;
    inFlight.add(signal.arena);
  }
  void fetch("/api/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signal)
  })
    .catch(() => {})
    .finally(() => {
      if (stream) inFlight.delete(signal.arena);
    });
}

// Abandono: la página se está muriendo, así que va por beacon.
export function sendQuitBeacon(arena: "race" | "duel", game: string) {
  sendBeaconJson({ arena, game, kind: "quit" });
}

// Colgar al cerrar la pestaña en mitad de una llamada: mismo problema, misma
// solución. Sin esto, el otro se queda con la llamada abierta y sonando.
export function sendHangupBeacon() {
  sendBeaconJson({ arena: "call", kind: "hangup" });
}

// "Me voy" del tacto compartido y de Estar juntos. Sin beacon, el otro se
// queda viendo un dedo fantasma o creyendo que sigues mirando el mismo cielo.
export function sendTouchLeaveBeacon() {
  sendBeaconJson({ arena: "touch", kind: "leave" });
}

export function sendTogetherLeaveBeacon() {
  sendBeaconJson({ arena: "together", here: false });
}

function sendBeaconJson(payload: Record<string, unknown>) {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify(payload);

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
