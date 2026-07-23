"use client";

import { useState } from "react";
import { Check, HeartHandshake, Wind } from "lucide-react";
import { repairSignalAction } from "@/actions/repair";
import { REPAIR_GESTURES } from "@/lib/repair";

// En caliente: pedir un respiro (para que "parar" no se confunda con "irse") y
// tender la mano con un gesto suave. Ambos llegan a la pareja al instante.
export function RepairMoment({ partnerName }: { partnerName: string }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fire(kind: "pause" | "reach", message: string | undefined, ok: string) {
    if (busy) return;
    setBusy(true);
    const res = await repairSignalAction({ kind, message });
    if (res.ok) {
      setConfirm(ok);
      setTimeout(() => setConfirm(null), 3500);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          <Wind className="h-4 w-4" /> Necesito un respiro
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Avísale con cariño de que necesitas parar un momento. No es marcharse: es cuidaros.
        </p>
        <button
          onClick={() => fire("pause", undefined, `Se lo has dicho a ${partnerName} con cariño.`)}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <Wind className="h-4 w-4" /> Pedir un respiro
        </button>
      </div>

      <div className="rounded-2xl border border-sand-deep bg-paper p-4">
        <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-rose-deep">
          <HeartHandshake className="h-4 w-4" /> Tender la mano
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Un gesto suave para bajar la tensión. {partnerName} podrá aceptarlo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REPAIR_GESTURES.map((g) => (
            <button
              key={g}
              onClick={() => fire("reach", g, `Le has tendido la mano: “${g}”`)}
              disabled={busy}
              className="rounded-full border border-rose/30 bg-rose-faint px-3.5 py-1.5 text-sm text-ink transition hover:border-rose hover:bg-rose/10 disabled:opacity-60"
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {confirm && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> {confirm}
        </p>
      )}
    </div>
  );
}
