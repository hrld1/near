"use server";

import { z } from "zod";
import { publish } from "@/lib/realtime";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";

// Relay de "Hundir la flota" por el bus SSE dentro de la pareja (como el 4 en
// raya). Por turnos, así que la latencia del bus no afecta: cada disparo lo
// resuelve el DEFENSOR en su cliente (sabe dónde están sus barcos) y responde.
// El primer "invite" manda push si la pareja tiene la app cerrada.

const schema = z.object({
  kind: z.enum(["invite", "accept", "fire", "result", "quit", "rematch"]),
  seed: z.number().int().min(0).max(1_000_000).optional(),
  r: z.number().int().min(0).max(15).optional(),
  c: z.number().int().min(0).max(15).optional(),
  hit: z.boolean().optional(),
  sunk: z.array(z.string().max(6)).max(6).optional(),
  allSunk: z.boolean().optional()
});

export const bsSignalAction = coupleAction<
  [
    input: {
      kind: "invite" | "accept" | "fire" | "result" | "quit" | "rematch";
      seed?: number;
      r?: number;
      c?: number;
      hit?: boolean;
      sunk?: string[];
      allSunk?: boolean;
    }
  ]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Jugada no valida" };
  notifyPartner(
    coupleId,
    partnerId,
    { type: "bs:signal", payload: { ...parsed.data, byId: user.id, byName: user.name } },
    parsed.data.kind === "invite"
      ? {
          title: `${user.name} te reta a Hundir la flota ⚓`,
          body: "Duelo por turnos, en directo",
          url: "/play/battleship",
          tag: "near-bs"
        }
      : undefined
  );
  return { ok: true };
});
