"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useCoupleStream } from "@/hooks/use-stream";

// Refresca los datos de servidor de la pagina cuando llegan eventos
// relevantes de la pareja (throttle de 1.5s para no saturar).
export function LiveRefresh({ types }: { types?: string[] }) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useCoupleStream((event) => {
    if (types && !types.includes(event.type)) return;
    const now = Date.now();
    if (now - lastRefresh.current < 1500) return;
    lastRefresh.current = now;
    router.refresh();
  });

  return null;
}
