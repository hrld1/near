import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
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
          {item.live && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              <span className="truncate">{item.live}</span>
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-rose" />
      </Card>
    </Link>
  );
}
