import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { skyForHour, type Sky } from "@/lib/sky";
import { timeInTz } from "@/lib/format";

// El gesto característico de la piel de Near (it27): una franja con el CIELO
// REAL de tu pareja ahora mismo — su gradiente según su hora local, estrellas
// si allí es de noche, su sol o su luna donde de verdad están. Reutiliza el
// motor puro de "Estar juntos" (lib/sky) y enlaza a esa ventana. Componente
// de servidor: cero JS en el cliente.

function localHourDecimal(timezone: string, now = new Date()): number {
  const [h, m] = timeInTz(now, timezone).split(":").map(Number);
  return h + m / 60;
}

// estrellas deterministas (mismas posiciones en servidor y cliente)
const STARS = [
  [8, 30], [16, 62], [27, 22], [38, 70], [47, 35], [58, 18],
  [66, 58], [74, 30], [83, 66], [91, 25], [95, 55], [21, 48]
] as const;

export function PartnerSky({ name, timezone }: { name: string; timezone: string }) {
  const hour = localHourDecimal(timezone);
  const sky: Sky = skyForHour(hour);
  const clock = timeInTz(new Date(), timezone);

  return (
    <Link
      href="/together"
      aria-label={`El cielo de ${name}: ${sky.label}. Abrir Estar juntos`}
      className="group relative block overflow-hidden rounded-2xl shadow-card transition hover:shadow-lift"
      style={{
        background: `linear-gradient(to bottom, ${sky.gradient[0]}, ${sky.gradient[1]}, ${sky.gradient[2]})`
      }}
    >
      {/* estrellas si allí es de noche */}
      {sky.stars &&
        STARS.map(([x, y], i) => (
          <span
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-white/80"
            style={{ left: `${x}%`, top: `${y}%`, opacity: i % 3 === 0 ? 0.9 : 0.5 }}
          />
        ))}
      {/* su sol o su luna, donde de verdad están en su cielo */}
      <span
        className="absolute h-4 w-4 rounded-full"
        style={{
          // recorrido acotado al 8–58%: que el astro nunca pise el CTA derecho
          left: `calc(${8 + sky.bodyX * 50}% )`,
          bottom: `${18 + sky.bodyY * 42}%`,
          background: sky.body === "sun" ? "#FFE9A4" : "#EEF1F8",
          boxShadow:
            sky.body === "sun"
              ? "0 0 14px 5px rgba(255, 226, 130, 0.55)"
              : "0 0 10px 3px rgba(226, 232, 248, 0.45)"
        }}
      />
      {/* velo para asegurar contraste del texto en cielos claros */}
      <span className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
      <span className="relative flex items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
            En el cielo de {name}
          </span>
          <span className="block font-display text-lg leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
            {sky.label} · {clock}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-white/85 transition group-hover:gap-2">
          Estar juntos <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </Link>
  );
}
