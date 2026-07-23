import Link from "next/link";
import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Tarjeta grande de hub: un icono, un titulo y una linea. Toda la tarjeta es
// un enlace. Se usa en /juntos y /recuerdos para que cada pantalla tenga
// acciones claras y de un solo toque.
//
// it35-audit: todas las tarjetas comparten el mismo chip rosa — antes cada
// una llevaba un gradiente propio (una barra de acento + icono de color
// distinto por tarjeta), que en un hub de 5-7 tarjetas se veía como un arcoíris
// sin ningún significado. El color de marca es suficiente para "esto es un
// enlace de Near"; lo que de verdad merece color es la señal viva (`live`),
// que ahora es siempre esmeralda — así "algo pasa ahí ahora" se lee igual en
// toda la app en vez de heredar el tono aleatorio de la tarjeta.
export type HubItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  // señal viva: qué pasa AHÍ ahora mismo ("Reto de hoy: Rompemuros",
  // "Próxima ventana: jueves 20:00"). Convierte el menú en producto.
  live?: string;
};

// Señal viva compartida (hero y tarjeta): un punto que late + el texto.
function LiveSignal({ text }: { text: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <span className="truncate">{text}</span>
    </p>
  );
}

// El destino protagonista del hub (it37, rediseño). No es una "tarjeta
// destacada" más: es una pieza alta que ancla la composición y llena el lienzo
// en vertical, para que el hub deje de ser un grupito de tarjetas flotando
// arriba. Recursos: la marca de agua de icono gigante y tenue (el mismo gesto
// que el hero del "reto del día" en /play), el chip de marca con resplandor, el
// título en Fraunces con cuerpo, y una llamada explícita anclada abajo.
export function HubHero({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group block h-full">
      <Card className="relative flex h-full min-h-[15rem] flex-col justify-between overflow-hidden border-rose/15 bg-gradient-to-br from-rose-faint via-paper to-paper p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-lift md:p-7">
        <Icon
          aria-hidden
          strokeWidth={1.25}
          className="pointer-events-none absolute -bottom-10 -right-8 h-64 w-64 text-rose/[0.07]"
        />
        <div className="relative">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
            <Icon className="h-6 w-6" />
          </span>
          <h2 className="mt-4 flex flex-wrap items-center gap-2 font-display text-3xl leading-tight text-ink">
            {item.title}
            {item.badge && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {item.badge}
              </span>
            )}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{item.description}</p>
          {item.live && <LiveSignal text={item.live} />}
        </div>
        <div className="relative mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose to-rose-deep px-5 py-2.5 text-sm font-medium text-white shadow-card transition group-hover:gap-2.5">
            Entrar <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

// La composición de un hub: el destino protagonista (alto) a la izquierda y un
// raíl de destinos de apoyo a la derecha que iguala su altura. Asimétrico, de
// revista: llena el ancho Y el alto, y crea jerarquía real en vez de una
// rejilla de tarjetas idénticas. En móvil se apila: protagonista y luego raíl.
export function HubGrid({ items }: { items: HubItem[] }) {
  if (items.length === 0) return null;
  const [hero, ...rest] = items;
  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_1fr]">
      <HubHero item={hero} />
      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {rest.map((item) => (
            <HubCard key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HubCard({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group">
      <Card className="flex h-full items-center gap-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose/10 text-rose-deep">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-lg text-ink">
            {item.title}
            {item.badge && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {item.badge}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-ink-soft">{item.description}</p>
          {item.live && <LiveSignal text={item.live} />}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-rose" />
      </Card>
    </Link>
  );
}
