"use server";

import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";

// Co-presencia en la ventana "Estar juntos": avisa a la pareja de que estás
// (o dejas de estar) mirando el mismo cielo. Efímero: solo se retransmite por
// el bus SSE dentro de la pareja, no se persiste ni manda push.
export const togetherHereAction = coupleAction<[here: boolean]>(
  async ({ user, coupleId }, here) => {
    publish(coupleId, { type: "together:here", payload: { userId: user.id, here } });
    return { ok: true };
  }
);
