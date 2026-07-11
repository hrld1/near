"use server";

import { z } from "zod";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";
import { DUEL_KEYS, duelByKey } from "@/lib/duels";

// Relay genérico de los duelos 1v1 EN VIVO (5 en raya, Reversi, Puntos y
// cajas...). Como el 4 en raya: el servidor solo retransmite señales dentro de
// la pareja; el bus SSE ordena los eventos y ambos clientes aplican el mismo
// reducer puro. No se persiste. El primer "invite" manda push si la pareja
// tiene la app cerrada.

const schema = z.object({
  game: z.enum(DUEL_KEYS as [string, ...string[]]),
  kind: z.enum(["invite", "accept", "move", "quit"]),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  move: z.array(z.number().int().min(0).max(99)).max(6).optional()
});

export const duelSignalAction = coupleAction<
  [input: { game: string; kind: "invite" | "accept" | "move" | "quit"; seed?: number; move?: number[] }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Jugada no valida" };
  const meta = duelByKey(parsed.data.game);
  if (!meta) return { ok: false, error: "Juego desconocido" };
  notifyPartner(
    coupleId,
    partnerId,
    {
      type: "duel:signal",
      payload: { ...parsed.data, byId: user.id, byName: user.name }
    },
    parsed.data.kind === "invite"
      ? {
          title: `${user.name} te reta a ${meta.name} ${meta.emoji}`,
          body: "Duelo por turnos, en directo",
          url: `/play/${meta.key}`,
          tag: `near-duel-${meta.key}`
        }
      : undefined
  );
  return { ok: true };
});
