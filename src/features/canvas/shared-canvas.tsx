"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, ImageDown, Loader2 } from "lucide-react";
import { canvasOpAction } from "@/actions/canvas";
import { createMomentAction } from "@/actions/moments";
import { useCoupleStream } from "@/hooks/use-stream";
import { uploadFile } from "@/lib/upload-client";
import { DrawSurface, type DrawHandle } from "@/features/canvas/draw-surface";
import { CanvasToolbar } from "@/features/canvas/canvas-toolbar";
import { cn } from "@/lib/utils";
import type { CanvasStroke, MemberInfo } from "@/types";

const COLORS = ["#e11d48", "#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#1f2937", "#fbbf24"];
const SIZES = [3, 7, 14];

// Lienzo libre compartido en vivo: cada trazo viaja al instante por SSE.
export function SharedCanvas({
  me,
  partner,
  initialStrokes
}: {
  me: MemberInfo;
  partner: MemberInfo | null;
  initialStrokes: CanvasStroke[];
}) {
  const surface = useRef<DrawHandle>(null);
  const lastSent = useRef(0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // siembra: lo que ya había dibujado
  useEffect(() => {
    surface.current?.load(initialStrokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useCoupleStream((event) => {
    if (event.type !== "canvas:op") return;
    if (event.payload.byId === me.id) return; // los míos ya están pintados en local
    const op = event.payload.op;
    if (op.kind === "clear") surface.current?.clear();
    else surface.current?.applyRemoteStroke(op.stroke);
  });

  function onLocalStroke(s: CanvasStroke, done: boolean) {
    setSaved(false);
    const now = Date.now();
    if (!done && now - lastSent.current < 70) return; // ~14 Hz mientras arrastra
    lastSent.current = now;
    void canvasOpAction({ kind: "stroke", stroke: { ...s, points: [...s.points] } });
  }

  function clearAll() {
    surface.current?.clear();
    void canvasOpAction({ kind: "clear" });
  }

  async function saveToAlbum() {
    if (!surface.current || surface.current.isEmpty()) return;
    setSaving(true);
    try {
      const blob = await surface.current.toBlob();
      if (!blob) return;
      const url = await uploadFile(blob, `lienzo-${Date.now()}.png`);
      const res = await createMomentAction({ kind: "PHOTO", imageUrl: url, title: "Nuestro lienzo" });
      if (res.ok) setSaved(true);
    } catch {
      // subida cancelada o fallida: sin ruido
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <CanvasToolbar
        colors={COLORS}
        sizes={SIZES}
        color={color}
        size={size}
        onColor={setColor}
        onSize={setSize}
        right={
          <>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-sand hover:text-ink"
            >
              <Eraser className="h-4 w-4" /> Borrar
            </button>
            <button
              onClick={saveToAlbum}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-rose px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <ImageDown className="h-4 w-4" />
              )}
              {saved ? "Guardado" : "Guardar"}
            </button>
          </>
        }
      />

      <DrawSurface
        ref={surface}
        color={color}
        size={size}
        onLocalStroke={onLocalStroke}
        className={cn("aspect-[4/3] w-full rounded-3xl border border-rose/15 shadow-card")}
      />

      <p className="text-center text-xs text-ink-soft">
        {partner
          ? `Lo que dibujas aparece al instante en la pantalla de ${partner.name}. Guardadlo en el álbum cuando os guste.`
          : "Aún no hay nadie vinculado."}
      </p>
    </div>
  );
}
