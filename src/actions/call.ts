"use server";

import { z } from "zod";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";
import type { CallSignalKind } from "@/types";

// Senalizacion WebRTC sobre el bus SSE existente: sin infraestructura extra.
// Los payloads (SDP/ICE) son opacos para el servidor; solo se retransmiten
// al otro miembro de la pareja. No se persisten.
//
// El primer "ring" viaja con initial=true: si la pareja tiene la app cerrada
// (sin conexión SSE abierta) le llega un push "te esta llamando". Los re-rings
// posteriores no lo llevan, así que solo hay una notificación por llamada.

const signalSchema = z.object({
  // sleep/wake/goodnight: modo "dormir juntos" sobre una llamada activa
  kind: z.enum([
    "ring",
    "accept",
    "decline",
    "offer",
    "answer",
    "ice",
    "hangup",
    "sleep",
    "wake",
    "goodnight"
  ]),
  data: z.string().max(50_000).optional(),
  initial: z.boolean().optional()
});

export const callSignalAction = coupleAction<
  [input: { kind: CallSignalKind; data?: string; initial?: boolean }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = signalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Señal no valida" };
  const isInitialRing = parsed.data.kind === "ring" && parsed.data.initial === true;
  notifyPartner(
    coupleId,
    partnerId,
    {
      type: "call:signal",
      payload: {
        fromId: user.id,
        fromName: user.name,
        kind: parsed.data.kind,
        data: parsed.data.data ?? null
      }
    },
    isInitialRing
      ? {
          title: `${user.name} te está llamando`,
          body: "Toca para contestar la videollamada",
          url: "/date-room",
          tag: "near-call"
        }
      : undefined
  );
  return { ok: true };
});
