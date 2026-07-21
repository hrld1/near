// Avisar del abandono cuando la página se está muriendo (it31).
//
// Una server action lanzada en el cleanup de un useEffect no es fiable: el
// navegador cancela las peticiones en vuelo al completar la navegación. Con
// latencia ~0 (localhost) llegaba siempre y por eso pasó desapercibido; contra
// un servidor real, no. `sendBeacon` encola la petición en el navegador y la
// entrega aunque la página ya no exista.
export function sendQuitBeacon(arena: "race" | "duel", game: string) {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify({ arena, game });

  if (typeof navigator.sendBeacon === "function") {
    // El tipo importa: con Blob se manda tal cual y el servidor lo lee como
    // JSON. Devuelve false si el navegador rechaza encolarlo (cuota), en cuyo
    // caso probamos igualmente con fetch.
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/quit", blob)) return;
  }

  // Reserva para navegadores sin sendBeacon: `keepalive` da la misma garantía
  // de supervivencia a la petición.
  void fetch("/api/quit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}
