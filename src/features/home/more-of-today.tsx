"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "near:more-today-open";

// La tercera capa de Hoy: todo lo que no es el ritual ni el "ahora mismo",
// plegado por defecto para que el ritual diario quepa sin scroll. El estado
// se recuerda por dispositivo. Los hijos vienen renderizados del servidor y
// solo se ocultan con CSS (abrir es instantáneo, sin saltos).
export function MoreOfToday({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(KEY) === "1");
  }, []);

  function toggle() {
    setOpen((o) => {
      window.localStorage.setItem(KEY, o ? "0" : "1");
      return !o;
    });
  }

  return (
    <section className="mt-4">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl border border-sand-deep bg-paper px-4 py-3 text-sm font-medium text-ink shadow-card transition hover:bg-sand"
      >
        <span>
          Más de hoy
          <span className="ml-2 text-xs font-normal text-ink-soft">racha, caja del día, coincidir, notas…</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-ink-soft transition", open && "rotate-180")} />
      </button>
      <div className={cn("mt-4", !open && "hidden")}>{children}</div>
    </section>
  );
}
