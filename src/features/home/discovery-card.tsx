"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, X } from "lucide-react";
import type { Discovery } from "@/lib/first-days";

// La primera semana (it30): una sola sugerencia al día, discreta y descartable.
// Nunca un tour modal. El descarte vive en localStorage por descubrimiento:
// si lo cierras, no vuelve; mañana tocará otro.
export function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  const storageKey = `near:discovery:${discovery.key}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(storageKey) !== "1");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // sin almacenamiento, solo se oculta esta vez
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-plum/20 bg-gradient-to-r from-plum/10 to-paper px-4 py-3 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-plum/12 text-plum">
        <Compass className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-plum">
          Día {discovery.day} · descubrid hoy
        </p>
        <p className="text-sm font-medium text-ink">{discovery.title}</p>
        <p className="truncate text-xs text-ink-soft">{discovery.description}</p>
      </div>
      <Link
        href={discovery.href}
        className="flex shrink-0 items-center gap-1 rounded-full bg-plum px-3.5 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90"
      >
        {discovery.cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={dismiss}
        title="No mostrar más"
        className="shrink-0 rounded-lg p-1.5 text-ink-soft transition hover:bg-sand hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
