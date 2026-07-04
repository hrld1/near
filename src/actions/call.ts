"use server";

import { z } from "zod";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";
import type { CallSignalKind } from "@/types";

// Senalizacion WebRTC sobre el bus SSE existente: sin infraestructura extra.
// Los payloads (SDP/ICE) son opacos para el servidor; solo se retransmiten
// al otro miembro de la pareja. No se persisten.

const signalSchema = z.object({
  kind: z.enum(["ring", "accept", "decline", "offer", "answer", "ice", "hangup"]),
  data: z.string().max(50_000).optional()
});

export const callSignalAction = coupleAction<[input: { kind: CallSignalKind; data?: string }]>(
  async ({ user, coupleId }, input) => {
    const parsed = signalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Senal no valida" };
    publish(coupleId, {
      type: "call:signal",
      payload: {
        fromId: user.id,
        fromName: user.name,
        kind: parsed.data.kind,
        data: parsed.data.data ?? null
      }
    });
    return { ok: true };
  }
);
