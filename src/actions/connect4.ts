"use server";

import { z } from "zod";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";

// 4 en raya EN VIVO: el servidor solo retransmite señales dentro de la
// pareja (como la señalización de llamada). El bus SSE ordena los eventos,
// así que ambos clientes aplican los movimientos en el mismo orden. No se
// persiste: es una partida en directo, ambos deben estar conectados.

const c4Schema = z.object({
  kind: z.enum(["invite", "accept", "move", "quit"]),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  col: z.number().int().min(0).max(6).optional()
});

export const c4SignalAction = coupleAction<
  [input: { kind: "invite" | "accept" | "move" | "quit"; seed?: number; col?: number }]
>(async ({ user, coupleId }, input) => {
  const parsed = c4Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Senal no valida" };
  publish(coupleId, {
    type: "c4:signal",
    payload: {
      kind: parsed.data.kind,
      byId: user.id,
      byName: user.name,
      seed: parsed.data.seed,
      col: parsed.data.col
    }
  });
  return { ok: true };
});
