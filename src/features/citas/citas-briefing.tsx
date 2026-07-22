"use client";

import { useState } from "react";
import { MapPin, Sparkles, Wallet, CalendarDays, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

// El "briefing": recoge de golpe lo que la planificadora preguntaría en un ida
// y vuelta (modo, cuándo, dónde, presupuesto, qué os apetece) y lo convierte en
// UN solo mensaje. Se llega al plan en un paso en vez de tres.
//
// El ahorro de dinero es menor de lo que parece — lo caro es el bucle de
// búsquedas dentro de una petición, no las preguntas — pero la experiencia
// mejora: menos fricción hasta la cita.
//
// Siempre se puede saltar y escribir a mano: hay gente que prefiere contarlo
// con sus palabras, y el chat sigue abierto después para cambiar lo que sea.

type Modo = "juntos" | "distancia";

const CUANDO = [
  { key: "finde", label: "Este finde" },
  { key: "noche", label: "Esta noche" },
  { key: "semana", label: "Entre semana" },
  { key: "ventana", label: "Cuando coincidamos" },
  { key: "otro", label: "Otro día…" }
] as const;

const PRESUPUESTO = [
  { key: "gratis", label: "Sin gastar" },
  { key: "20", label: "~20 €" },
  { key: "50", label: "~50 €" },
  { key: "100", label: "~100 €" },
  { key: "otro", label: "Otro…" },
  { key: "libre", label: "Sin límite" }
] as const;

type CuandoKey = (typeof CUANDO)[number]["key"];
type PresupuestoKey = (typeof PRESUPUESTO)[number]["key"];

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-rose bg-rose text-white shadow-glow"
          : "border-sand-deep bg-paper text-ink hover:border-rose/50 hover:bg-rose-faint"
      )}
    >
      {children}
    </button>
  );
}

function Campo({
  icon,
  titulo,
  children
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <span className="text-rose-deep">{icon}</span>
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function CitasBriefing({
  partnerName,
  myCity,
  partnerCity,
  onSubmit,
  onSkip
}: {
  partnerName: string;
  myCity: string | null;
  partnerCity: string | null;
  onSubmit: (mensaje: string) => void;
  onSkip: () => void;
}) {
  const [modo, setModo] = useState<Modo>("distancia");
  const [cuando, setCuando] = useState<CuandoKey>("finde");
  const [fecha, setFecha] = useState("");
  const [ciudad, setCiudad] = useState(partnerCity ?? myCity ?? "");
  const [presupuesto, setPresupuesto] = useState<PresupuestoKey>("50");
  const [presupuestoOtro, setPresupuestoOtro] = useState("");
  const [apetece, setApetece] = useState("");

  const faltaCiudad = modo === "juntos" && !ciudad.trim();
  const faltaImporte = presupuesto === "otro" && !presupuestoOtro.trim();

  function componer() {
    const partes: string[] = [];

    if (modo === "juntos") {
      partes.push(`Quiero planear una cita presencial con ${partnerName}${ciudad.trim() ? ` en ${ciudad.trim()}` : ""}.`);
    } else {
      partes.push(`Quiero planear una cita a distancia con ${partnerName}, de las que se hacen a la vez desde casa.`);
    }

    if (cuando === "otro" && fecha) {
      partes.push(`Sería el ${fecha}.`);
    } else if (cuando === "ventana") {
      partes.push("Cuándo: en nuestra próxima franja libre en común, la que ya conoces de Coincidir.");
    } else {
      const texto = CUANDO.find((c) => c.key === cuando)?.label.toLowerCase() ?? "";
      partes.push(`Cuándo: ${texto}.`);
    }

    // El presupuesto es POR PERSONA: hay que decírselo explícito o el modelo
    // lo interpreta como total y se queda corto de plan.
    const pres = PRESUPUESTO.find((p) => p.key === presupuesto);
    if (presupuesto === "gratis") partes.push("Presupuesto: nada, plan gratis.");
    else if (presupuesto === "libre") partes.push("Presupuesto: sin límite concreto.");
    else if (presupuesto === "otro") partes.push(`Presupuesto: ${presupuestoOtro.trim()} por persona.`);
    else partes.push(`Presupuesto: ${pres?.label} por persona.`);

    if (apetece.trim()) partes.push(`Nos apetece: ${apetece.trim()}`);

    partes.push("Ya tienes todo lo que necesitas: no me preguntes más y proponme el plan.");
    return partes.join(" ");
  }

  return (
    <div className="space-y-5 p-1">
      {/* Cabecera mínima: la página ya explica arriba qué hace esto, y en un
          móvil cada línea de más empuja el botón fuera de la pantalla. */}
      <h2 className="flex items-center gap-2 font-display text-xl text-ink">
        <Sparkles className="h-5 w-5 text-rose-deep" />
        Vuestra cita, en cuatro toques
      </h2>

      <Campo icon={<MapPin className="h-3.5 w-3.5" />} titulo="Cómo">
        <div className="flex gap-2">
          <Chip active={modo === "distancia"} onClick={() => setModo("distancia")}>
            A distancia
          </Chip>
          <Chip active={modo === "juntos"} onClick={() => setModo("juntos")}>
            Juntos, en persona
          </Chip>
        </div>
        {modo === "juntos" && (
          <input
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            maxLength={80}
            placeholder="¿En qué ciudad?"
            className="mt-2.5 w-full rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
          />
        )}
      </Campo>

      <Campo icon={<CalendarDays className="h-3.5 w-3.5" />} titulo="Cuándo">
        <div className="flex flex-wrap gap-2">
          {CUANDO.map((c) => (
            <Chip key={c.key} active={cuando === c.key} onClick={() => setCuando(c.key)}>
              {c.label}
            </Chip>
          ))}
        </div>
        {cuando === "otro" && (
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-2.5 w-full rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
          />
        )}
      </Campo>

      <Campo icon={<Wallet className="h-3.5 w-3.5" />} titulo="Presupuesto por persona">
        <div className="flex flex-wrap gap-2">
          {PRESUPUESTO.map((p) => (
            <Chip key={p.key} active={presupuesto === p.key} onClick={() => setPresupuesto(p.key)}>
              {p.label}
            </Chip>
          ))}
        </div>
        {presupuesto === "otro" && (
          <input
            value={presupuestoOtro}
            onChange={(e) => setPresupuestoOtro(e.target.value)}
            maxLength={40}
            placeholder="¿Cuánto? p. ej. 35 €"
            className="mt-2.5 w-full rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
          />
        )}
      </Campo>

      <Campo icon={<PencilLine className="h-3.5 w-3.5" />} titulo="Algo que os apetezca (opcional)">
        <textarea
          value={apetece}
          onChange={(e) => setApetece(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="Cenar algo rico, ver el atardecer, nada de multitudes…"
          className="w-full resize-none rounded-xl border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
        />
      </Campo>

      {/* Colchón en móvil: la barra de navegación flota fija sobre el
          contenido, y si alguien se queda a media bajada el botón principal
          cae justo debajo. Comprobado con elementFromPoint, no a ojo. */}
      <div className="space-y-2.5 pt-1 pb-16 md:pb-0">
        <button
          type="button"
          onClick={() => onSubmit(componer())}
          disabled={faltaCiudad || faltaImporte}
          className="w-full rounded-xl bg-rose py-3 text-sm font-medium text-white shadow-glow transition hover:bg-rose-deep disabled:opacity-50 disabled:shadow-none"
        >
          Planear la cita 💘
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-xs text-ink-soft underline decoration-dotted underline-offset-4 transition hover:text-ink"
        >
          Prefiero contárselo con mis palabras
        </button>
      </div>
    </div>
  );
}
