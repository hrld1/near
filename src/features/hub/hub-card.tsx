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

// El destino principal del hub (it37): en vez de N tarjetas iguales que se leen
// como un menú, el primero —el más importante, según el orden de la página—
// gana presencia: icono grande en el chip de marca, título mayor y una llamada
// explícita. Da un foco claro ("empieza por aquí") y llena el lienzo con
// intención en vez de dejar el hub como un grupo pequeño arriba del todo.
export function HubHero({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group block">
      <Card className="flex items-center gap-5 border-rose/15 bg-gradient-to-br from-rose-faint via-paper to-paper p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
          <Icon className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-2xl leading-tight text-ink">
            {item.title}
            {item.badge && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {item.badge}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
          {item.live && <LiveSignal text={item.live} />}
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-paper/70 px-4 py-2 text-sm font-medium text-rose-deep shadow-card transition group-hover:gap-2.5 sm:flex">
          Entrar <ArrowRight className="h-4 w-4" />
        </span>
      </Card>
    </Link>
  );
}

// La rejilla de un hub: el primer destino como hero, el resto en dos columnas.
export function HubGrid({ items }: { items: HubItem[] }) {
  if (items.length === 0) return null;
  const [hero, ...rest] = items;
  return (
    <div className="space-y-3">
      <HubHero item={hero} />
      {rest.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
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
