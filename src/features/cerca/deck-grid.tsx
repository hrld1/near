import Link from "next/link";
import { cn } from "@/lib/utils";

export type DeckProgress = {
  key: string;
  name: string;
  emoji: string;
  tagline: string;
  accent: string;
  soft: string;
  text: string;
  intimate?: boolean;
  total: number;
  revealed: number;
};

// Rejilla de mazos con progreso "X/N reveladas".
export function DeckGrid({ items }: { items: DeckProgress[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((d) => {
        const pct = d.total > 0 ? Math.round((d.revealed / d.total) * 100) : 0;
        return (
          <Link key={d.key} href={`/cerca/${d.key}`} className="group">
            <div className="h-full rounded-2xl border border-sand-deep bg-paper p-4 shadow-card transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <div className="flex items-start justify-between">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-xl", d.soft)}>
                  {d.emoji}
                </span>
                {d.intimate && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                    Íntimo
                  </span>
                )}
              </div>
              <h3 className="mt-2.5 font-display text-lg text-ink">{d.name}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{d.tagline}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-2xs text-ink-soft">
                  <span>{d.revealed} de {d.total} reveladas</span>
                  <span className={d.text}>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className={cn("h-full rounded-full bg-gradient-to-r", d.accent)} style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
