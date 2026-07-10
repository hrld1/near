import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCouple } from "@/lib/couple";
import { getCanvasStrokes } from "@/lib/canvas-log";
import { SharedCanvas } from "@/features/canvas/shared-canvas";

export const metadata: Metadata = { title: "Lienzo" };
export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  const { user, couple, partner } = await requireCouple();
  const strokes = getCanvasStrokes(couple.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/juntos"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink-soft transition hover:bg-sand hover:text-ink"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl leading-tight text-ink">Lienzo</h1>
      </div>
      <SharedCanvas
        me={{ id: user.id, name: user.name, image: user.image }}
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
        initialStrokes={strokes}
      />
    </div>
  );
}
