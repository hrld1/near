"use client";

import { useState } from "react";
import { ChevronDown, HeartHandshake, MapPin, Trash2, Video } from "lucide-react";
import { acceptDatePlanAction, deleteDatePlanAction } from "@/actions/citas";
import type { DatePlanData } from "@/lib/citas";
import { Confetti } from "@/features/play/confetti";
import { sfx, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { ItineraryCard } from "./itinerary-card";

// Las citas planeadas de la pareja: propuestas y aceptadas. Quien no la
// propuso puede apuntarse ("Me apunto 💛"); cualquiera puede borrarla.

export type PlanListItemDto = {
  id: string;
  authorId: string;
  authorName: string;
  status: string; // PROPUESTA | ACEPTADA
  whenLabel: string | null;
  plan: DatePlanData;
};

export function PlanList({ items, myId, partnerName }: { items: PlanListItemDto[]; myId: string; partnerName: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sand-deep bg-paper/60 px-4 py-6 text-center text-sm text-ink-soft">
        Aún no hay citas planeadas. La primera está a una conversación de distancia.
      </p>
    );
  }

  async function accept(id: string) {
    if (busy) return;
    setBusy(id);
    const res = await acceptDatePlanAction(id);
    if (res.ok) {
      setCelebrate(true);
      sfx.success();
      vibrate([30, 60, 30]);
      setTimeout(() => setCelebrate(false), 3000);
    }
    setBusy(null);
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(id);
    await deleteDatePlanAction(id);
    setBusy(null);
  }

  return (
    <div className="space-y-2.5">
      {celebrate && <Confetti />}
      {items.map((item) => {
        const mine = item.authorId === myId;
        const expanded = open === item.id;
        return (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-sand-deep bg-paper shadow-card">
            <button
              onClick={() => setOpen(expanded ? null : item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.plan.mode === "distancia" ? "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" : "bg-rose/12 text-rose-deep"
                )}
              >
                {item.plan.mode === "distancia" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base text-ink">{item.plan.title}</span>
                <span className="block text-xs text-ink-soft">
                  {[item.whenLabel, item.plan.city, `de ${mine ? "ti" : item.authorName}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide",
                  item.status === "ACEPTADA"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {item.status === "ACEPTADA" ? "Aceptada" : "Propuesta"}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-soft transition", expanded && "rotate-180")} />
            </button>

            {expanded && (
              <div className="border-t border-sand px-4 py-3">
                <ItineraryCard plan={item.plan} partnerName={partnerName} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  {item.status === "PROPUESTA" && !mine ? (
                    <button
                      onClick={() => accept(item.id)}
                      disabled={busy === item.id}
                      className="flex items-center gap-1.5 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-60"
                    >
                      <HeartHandshake className="h-4 w-4" /> Me apunto
                    </button>
                  ) : (
                    <span className="text-xs text-ink-soft">
                      {item.status === "ACEPTADA" ? "Los dos dentro. Solo queda vivirla" : `Esperando a ${partnerName}…`}
                    </span>
                  )}
                  <button
                    onClick={() => remove(item.id)}
                    disabled={busy === item.id}
                    aria-label="Borrar cita"
                    className="rounded-lg p-1.5 text-ink-soft transition hover:bg-rose/10 hover:text-rose-deep disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
