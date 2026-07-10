import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { getCanvasStrokes } from "@/lib/canvas-log";
import { CanvasRoom } from "@/features/canvas/canvas-room";

export const metadata: Metadata = { title: "Lienzo" };
export const dynamic = "force-dynamic";

export default async function CanvasPage() {
  const { user, couple, partner } = await requireCouple();
  const strokes = getCanvasStrokes(couple.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <CanvasRoom
        me={{ id: user.id, name: user.name, image: user.image }}
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
        initialStrokes={strokes}
      />
    </div>
  );
}
