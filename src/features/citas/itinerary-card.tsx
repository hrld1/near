"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, HeartHandshake, MapPin, Video } from "lucide-react";
import { proposeDatePlanAction } from "@/actions/citas";
import type { DatePlanData } from "@/lib/citas";
import { sfx, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";

// La tarjeta de itinerario: el plan que entrega la IA, renderizado desde
// DATOS tipados (no prosa). En el chat lleva el botón de proponer; también se
// reutiliza (sin botón) para ver una cita ya guardada.

function StepLink({ url, children }: { url?: string; children: React.ReactNode }) {
  if (!url) return <>{children}</>;
  // rutas internas de Near (modo distancia) → Link; externas → nueva pestaña
  if (url.startsWith("/")) {
    return (
      <Link href={url} className="text-rose-deep underline-offset-2 hover:underline">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-rose-deep underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function ItineraryCard({
  plan,
  partnerName,
  proposable = false
}: {
  plan: DatePlanData;
  partnerName: string;
  proposable?: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function propose() {
    if (state !== "idle") return;
    setState("sending");
    setError(null);
    const res = await proposeDatePlanAction(plan);
    if (res.ok) {
      setState("done");
      sfx.success();
      vibrate(20);
    } else {
      setState("idle");
      setError(res.error);
    }
  }

  const meta: string[] = [];
  if (plan.date) meta.push(plan.date);
  if (plan.city) meta.push(plan.city);
  if (plan.budget) meta.push(plan.budget);

  return (
    <div className="overflow-hidden rounded-2xl border border-rose/25 bg-paper shadow-card">
      <div className="border-b border-rose/10 bg-gradient-to-br from-rose-faint via-paper to-paper px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-deep">
          {plan.mode === "distancia" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
          {plan.mode === "distancia" ? "Cita a distancia" : "Cita juntos"}
        </p>
        <h3 className="mt-0.5 font-display text-lg leading-snug text-ink">{plan.title}</h3>
        {meta.length > 0 && <p className="mt-0.5 text-xs text-ink-soft">{meta.join(" · ")}</p>}
      </div>

      <div className="px-4 py-2">
        {plan.steps.map((step, i) => (
          <div
            key={i}
            className={cn("grid grid-cols-[52px_1fr] gap-3 py-2.5", i > 0 && "border-t border-dashed border-sand-deep")}
          >
            <span className="pt-0.5 font-mono text-xs font-bold text-rose-deep">{step.time}</span>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">
                <StepLink url={step.url}>{step.place}</StepLink>
                {step.cost && <span className="ml-1.5 text-xs font-normal text-ink-soft">· {step.cost}</span>}
              </p>
              <p className="text-xs leading-relaxed text-ink-soft">{step.note}</p>
            </div>
          </div>
        ))}
      </div>

      {proposable && (
        <div className="border-t border-sand px-4 py-3">
          {state === "done" ? (
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Propuesta enviada a {partnerName} — está en vuestras citas
            </p>
          ) : (
            <button
              onClick={propose}
              disabled={state === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-60"
            >
              <HeartHandshake className="h-4 w-4" />
              {state === "sending" ? "Guardando…" : `Guardar y proponer a ${partnerName}`}
            </button>
          )}
          {error && <p className="mt-2 text-center text-xs text-red-700 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
