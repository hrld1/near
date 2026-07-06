import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Tarjeta grande de hub: un icono con color propio, un titulo y una linea.
// Toda la tarjeta es un enlace. Se usa en /juntos y /recuerdos para que cada
// pantalla tenga acciones claras y de un solo toque.
export type HubItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string; // gradiente tailwind, p.ej. "from-rose to-plum"
  accentSoft: string; // fondo suave del icono, p.ej. "bg-rose/12"
  accentText: string; // color del icono
  badge?: string;
};

export function HubCard({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group">
      <Card className="relative flex h-full items-center gap-4 overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80", item.accent)} />
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            item.accentSoft,
            item.accentText
          )}
        >
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
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-rose" />
      </Card>
    </Link>
  );
}
