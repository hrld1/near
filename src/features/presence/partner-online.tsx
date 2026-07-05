"use client";

import { useState } from "react";
import { useCoupleStream } from "@/hooks/use-stream";
import { cn } from "@/lib/utils";

// "En Near ahora": punto verde vivo mientras la pareja tiene la app abierta.
// El estado inicial llega del servidor (isUserOnline) y las transiciones de
// conexion (evento "online") lo mantienen al dia sin recargar. Nada cuando
// está desconectada: entonces manda la presencia manual (Libre/Ocupado…).
export function PartnerOnline({
  partnerId,
  initialOnline,
  withLabel = true,
  className
}: {
  partnerId: string;
  initialOnline: boolean;
  withLabel?: boolean;
  className?: string;
}) {
  const [online, setOnline] = useState(initialOnline);

  useCoupleStream((event) => {
    if (event.type !== "online") return;
    if (event.payload.userId !== partnerId) return;
    setOnline(event.payload.online);
  });

  if (!online) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {withLabel && <span className="font-medium">en Near</span>}
    </span>
  );
}
