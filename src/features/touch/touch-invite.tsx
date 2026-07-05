"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fingerprint, X } from "lucide-react";
import { useCoupleStream } from "@/hooks/use-stream";
import { heartbeat, sfx } from "@/lib/sound";

// Aviso global: la pareja te invita a tocar desde cualquier pantalla. Suena y
// vibra como un nudge, y lleva directo a la superficie de Tacto.
export function TouchInvite({ myId }: { myId: string }) {
  const pathname = usePathname();
  const [from, setFrom] = useState<string | null>(null);

  useCoupleStream((event) => {
    if (event.type !== "touch:signal") return;
    if (event.payload.kind !== "invite") return;
    if (event.payload.userId === myId) return;
    setFrom(event.payload.name);
    sfx.pulse();
    heartbeat();
  });

  useEffect(() => {
    if (!from) return;
    const timeout = setTimeout(() => setFrom(null), 15000);
    return () => clearTimeout(timeout);
  }, [from]);

  // en la propia superficie el aviso sobra
  if (!from || pathname.startsWith("/touch")) return null;

  return (
    <div className="fixed inset-x-0 top-5 z-[55] flex justify-center px-4">
      <div className="flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-full border border-rose/25 bg-paper px-4 py-3 shadow-lift">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose/12 text-rose">
          <Fingerprint className="h-5 w-5 motion-safe:animate-pulse" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-ink">
          <span className="font-semibold">{from}</span> quiere tocarte
        </p>
        <Link
          href="/touch"
          onClick={() => setFrom(null)}
          className="shrink-0 rounded-full bg-rose px-4 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep"
        >
          Tocar
        </Link>
        <button
          onClick={() => setFrom(null)}
          className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-sand hover:text-ink"
          title="Ahora no"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
