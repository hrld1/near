"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Paleta de color + grosor + acciones (slot derecho). Compartida por el lienzo
// libre y los modos de juego.
export function CanvasToolbar({
  colors,
  sizes,
  color,
  size,
  onColor,
  onSize,
  right
}: {
  colors: string[];
  sizes: number[];
  color: string;
  size: number;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sand bg-paper p-2.5 shadow-card">
      <div className="flex items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onColor(c)}
            className={cn(
              "h-7 w-7 rounded-full border-2 transition",
              color === c ? "scale-110 border-ink" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div className="ml-1 flex items-center gap-1.5">
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => onSize(s)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition",
              size === s ? "border-rose bg-rose-faint" : "border-sand hover:bg-sand"
            )}
            aria-label={`Grosor ${s}`}
          >
            <span className="rounded-full bg-ink" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
