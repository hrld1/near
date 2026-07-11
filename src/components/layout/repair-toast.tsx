"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake, MessagesSquare, Sun, Wind } from "lucide-react";
import { repairSignalAction } from "@/actions/repair";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx } from "@/lib/sound";

type Toast = { kind: "pause" | "reach" | "accept" | "aftermath"; name: string; message?: string };

// Aviso global y calmado de los gestos de reparación: llega esté donde esté la
// otra persona. Paleta verde salvia (distinta del rosa) para marcar el tono.
export function RepairToast({ myId }: { myId: string }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [accepting, setAccepting] = useState(false);

  useCoupleStream((event) => {
    if (event.type !== "repair:signal") return;
    if (event.payload.byId === myId) return;
    setToast({ kind: event.payload.kind, name: event.payload.byName, message: event.payload.message });
    sfx.message();
  });

  useEffect(() => {
    if (!toast) return;
    const ms = toast.kind === "reach" ? 12000 : 6500;
    const t = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  async function accept() {
    setAccepting(true);
    await repairSignalAction({ kind: "accept" });
    setAccepting(false);
    setToast(null);
  }

  const Icon = { pause: Wind, reach: HeartHandshake, accept: Sun, aftermath: MessagesSquare }[toast.kind];
  const title = {
    pause: `${toast.name} necesita un respiro`,
    reach: `${toast.name} te tiende la mano`,
    accept: `${toast.name} ha aceptado tu mano 💛`,
    aftermath: `${toast.name} ha compartido cómo se sintió`
  }[toast.kind];
  const sub = {
    pause: "Volverá — no es que se vaya 🕊️",
    reach: toast.message ?? "Quiere acercarse",
    accept: "Estáis más cerca",
    aftermath: "Ábrelo en Reparar cuando estés listo/a"
  }[toast.kind];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border border-emerald-500/30 bg-paper px-5 py-3 shadow-lift">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="truncate text-xs text-ink-soft">{sub}</p>
        </div>
        {toast.kind === "reach" && (
          <button
            onClick={accept}
            disabled={accepting}
            className="shrink-0 rounded-full bg-rose px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-60"
          >
            Acepto 💛
          </button>
        )}
        {toast.kind === "aftermath" && (
          <Link
            href="/reparar"
            onClick={() => setToast(null)}
            className="shrink-0 rounded-full border border-emerald-500/40 px-3.5 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            Abrir
          </Link>
        )}
      </div>
    </div>
  );
}
