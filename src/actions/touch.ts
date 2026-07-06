"use server";

import { z } from "zod";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";

// "Beso de pulgar": presencia y posición del dedo se retransmiten por el bus
// SSE dentro de la pareja (mismo patron que la señalizacion de llamada o el
// 4 en raya en vivo). Efimero: nada se persiste. Solo la invitación manda
// push si la pareja no tiene la app abierta.
//
// Los "move" son de alta frecuencia: van sin push, así que notifyPartner solo
// publica en el bus sin tocar la base de datos ni comprobar presencia.

const touchSchema = z.object({
  kind: z.enum(["join", "leave", "move", "invite"]),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  pressing: z.boolean().optional()
});

export const touchSignalAction = coupleAction<
  [input: { kind: "join" | "leave" | "move" | "invite"; x?: number; y?: number; pressing?: boolean }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = touchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Señal no valida" };
  const { kind, x, y, pressing } = parsed.data;
  notifyPartner(
    coupleId,
    partnerId,
    {
      type: "touch:signal",
      payload: { kind, userId: user.id, name: user.name, x, y, pressing }
    },
    kind === "invite"
      ? {
          title: `${user.name} quiere tocarte 👆`,
          body: "Apoyad el dedo en la pantalla a la vez",
          url: "/touch",
          tag: "near-touch"
        }
      : undefined
  );
  return { ok: true };
});
