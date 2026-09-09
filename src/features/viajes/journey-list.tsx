import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type JourneyProgress = {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  soft: string;
  text: string;
  total: number;
  done: number; // pasos abiertos por los dos
  status: string; // pista corta de qué toca ahora
};

// Rejilla de viajes con su avance y de quién es el turno. Server Component: por
// eso puede recibir el icono como prop (una función solo cruza a "use client").
export function JourneyList({ items }: { items: JourneyProgress[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((j) => {
        const pct = j.total > 0 ? Math.round((j.done / j.total) * 100) : 0;
        const finished = j.done === j.total;
        const Icon = j.icon;
        return (
          <Link key={j.key} href={`/viajes/${j.key}`} className="group">
            <div className="flex h-full flex-col rounded-2xl border border-sand-deep bg-paper p-4 shadow-card transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <div className="flex items-start justify-between">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", j.soft, j.text)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold",
                    finished ? "bg-rose/12 text-rose-deep" : "bg-sand text-ink-soft"
                  )}
                >
                  {finished && <Check className="h-3 w-3" strokeWidth={3} />}
                  {j.status}
                </span>
              </div>
              <h3 className="mt-2.5 font-display text-lg text-ink">{j.title}</h3>
              <p className="mt-0.5 flex-1 text-xs leading-relaxed text-ink-soft">{j.subtitle}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-2xs text-ink-soft">
                  <span>
                    {j.done} de {j.total} pasos
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-rose-deep">
                    {finished ? "Ver de nuevo" : "Seguir"} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r", j.accent)}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
