import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { FIRST_STEPS, type FirstStepKey } from "@/lib/first-days";
import { cn } from "@/lib/utils";

export type FirstDayProgress = Record<FirstStepKey, boolean>;

// "Vuestro primer día" (it30): la guía de los primeros pasos, con el progreso
// de los DOS. Componente de servidor puro: el padre decide si se muestra
// (pareja de <=7 días y lista sin completar) y de dónde salen los checks
// (registros que ya existen — ningún esquema nuevo).
export function FirstDay({
  partnerName,
  me,
  partner
}: {
  partnerName: string;
  me: FirstDayProgress;
  partner: FirstDayProgress;
}) {
  const myDone = FIRST_STEPS.filter((s) => me[s.key]).length;
  const partnerDone = FIRST_STEPS.filter((s) => partner[s.key]).length;
  const mineComplete = myDone === FIRST_STEPS.length;

  return (
    <section className="overflow-hidden rounded-3xl border border-plum/25 bg-gradient-to-br from-plum/10 via-paper to-rose-faint shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-plum/10 px-5 py-3">
        <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-plum">
          <Sparkles className="h-4 w-4" /> Vuestro primer día
        </p>
        <p className="text-xs font-medium text-ink-soft">
          Tú {myDone}/4 · {partnerName} {partnerDone}/4
        </p>
      </div>

      <div className="p-5">
        <p className="font-display text-xl leading-snug text-ink">
          {mineComplete
            ? `Tu parte está hecha 💛 Cuando ${partnerName} termine la suya, esta lista se despide sola.`
            : "Cuatro pasos y Near empieza a contar vuestra historia."}
        </p>

        <ul className="mt-4 grid gap-2">
          {FIRST_STEPS.map((step) => {
            const done = me[step.key];
            const row = (
              <>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                    done
                      ? "border-plum bg-plum text-white"
                      : "border-sand-deep bg-paper text-transparent"
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", done ? "text-ink-soft line-through decoration-plum/40" : "text-ink")}>
                    {step.label}
                  </span>
                  {!done && <span className="block text-xs text-ink-soft">{step.hint}</span>}
                </span>
                {partner[step.key] && (
                  <span className="shrink-0 rounded-full bg-plum/10 px-2 py-0.5 text-[10px] font-semibold text-plum">
                    {partnerName} ✓
                  </span>
                )}
                {!done && step.href && <ArrowRight className="h-4 w-4 shrink-0 text-plum" />}
              </>
            );
            return (
              <li key={step.key}>
                {!done && step.href ? (
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-2xl bg-paper/80 px-3.5 py-2.5 shadow-card transition hover:shadow-lift"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl bg-paper/60 px-3.5 py-2.5">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
