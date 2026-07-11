"use server";

import { z } from "zod";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";
import { gameByKey } from "@/lib/games";
import { raceEnabled } from "@/lib/race";

// Relay del "Duelo en vivo" de los juegos de puntuación. Como los duelos de
// tablero: el servidor solo retransmite señales dentro de la pareja (no se
// persiste). El primer "invite" manda push si la pareja tiene la app cerrada.

const schema = z.object({
  game: z.string().max(20),
  kind: z.enum(["invite", "accept", "score", "done", "quit", "rematch"]),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  score: z.number().min(-100_000).max(10_000_000).optional()
});

export const raceSignalAction = coupleAction<
  [input: { game: string; kind: "invite" | "accept" | "score" | "done" | "quit" | "rematch"; seed?: number; score?: number }]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success || !raceEnabled(parsed.data.game)) return { ok: false, error: "Duelo no valido" };
  const def = gameByKey(parsed.data.game);
  notifyPartner(
    coupleId,
    partnerId,
    { type: "race:signal", payload: { ...parsed.data, byId: user.id, byName: user.name } },
    parsed.data.kind === "invite"
      ? {
          title: `${user.name} te reta a ${def?.name ?? "un juego"} en vivo`,
          body: "Duelo a la vez, marcador en directo",
          url: `/play/${parsed.data.game}/vs`,
          tag: `near-race-${parsed.data.game}`
        }
      : undefined
  );
  return { ok: true };
});
