// El cielo de la distancia: dado la hora local de una persona, describe cómo
// se ve su cielo ahora mismo (color, fase, sol o luna y su altura). Puro y
// determinista para poder testearlo; lo usa la ventana "Estar juntos" para
// pintar de fondo el cielo de tu pareja.

export type SkyPhase = "night" | "dawn" | "day" | "dusk";

export type Sky = {
  phase: SkyPhase;
  label: string; // "es de noche" en el sitio de la otra persona
  // gradiente de fondo, de arriba a abajo (colores CSS)
  gradient: [string, string, string];
  stars: boolean; // pintar estrellas
  body: "sun" | "moon"; // astro visible
  // posición del astro en el cielo, normalizada:
  bodyX: number; // 0 (este/izq) → 1 (oeste/der)
  bodyY: number; // 0 (horizonte) → 1 (cénit)
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function arc(hour: number, start: number, span: number): { x: number; y: number } {
  // t recorre 0..1 desde que el astro sale (start) durante 'span' horas
  const t = clamp01((hour - start) / span);
  return { x: t, y: Math.max(0, Math.sin(t * Math.PI)) };
}

// hour: hora local en formato decimal 0..24 (p.ej. 13.5 = 13:30).
export function skyForHour(hour: number): Sky {
  const h = ((hour % 24) + 24) % 24;
  const isDay = h >= 7 && h < 19;
  const body: "sun" | "moon" = isDay ? "sun" : "moon";
  // el sol describe su arco de 07:00 a 19:00; la luna, de 19:00 a 07:00
  const { x: bodyX, y: bodyY } = isDay
    ? arc(h, 7, 12)
    : arc((h + 24 - 19) % 24, 0, 12);

  let phase: SkyPhase;
  let gradient: [string, string, string];
  let label: string;
  let stars = false;

  if (h < 5 || h >= 21) {
    phase = "night";
    gradient = ["#0a0e27", "#141a3a", "#1e1836"];
    label = "es de noche";
    stars = true;
  } else if (h < 8) {
    phase = "dawn";
    gradient = ["#2a3a6b", "#8a6a9a", "#e8a77c"];
    label = "amanece";
    stars = h < 6;
  } else if (h < 18) {
    phase = "day";
    gradient = ["#4a90d9", "#7ab8e8", "#cfe8f7"];
    label = "es de día";
  } else {
    phase = "dusk";
    gradient = ["#1f2b52", "#7a4a7a", "#e0805a"];
    label = "atardece";
  }

  return { phase, label, gradient, stars, body, bodyX, bodyY };
}
