"use server";

import { z } from "zod";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";
import { recordStroke, clearCanvas } from "@/lib/canvas-log";
import type { CanvasOp } from "@/types";

// Lienzo compartido en vivo: cada trazo (o el "limpiar") viaja por el bus SSE
// dentro de la pareja, igual que la señalizacion de llamada o el beso de pulgar.
// Alta frecuencia mientras se dibuja: sin push, solo bus. El trazo se guarda
// también en el registro en memoria (canvas-log) para quien entre tarde.

const strokeSchema = z.object({
  id: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  size: z.number().min(0.5).max(48),
  // puntos normalizados 0..1 intercalados x,y (con holgura en los bordes)
  points: z.array(z.number().min(-0.05).max(1.05)).min(2).max(4000)
});

const opSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stroke"), stroke: strokeSchema }),
  z.object({ kind: z.literal("clear") })
]);

export const canvasOpAction = coupleAction<[op: CanvasOp]>(async ({ user, coupleId }, op) => {
  const parsed = opSchema.safeParse(op);
  if (!parsed.success) return { ok: false, error: "Trazo no valido" };
  if (parsed.data.kind === "clear") clearCanvas(coupleId);
  else recordStroke(coupleId, parsed.data.stroke);
  publish(coupleId, { type: "canvas:op", payload: { byId: user.id, op: parsed.data } });
  return { ok: true };
});
