"use server";

import { z } from "zod";
import { publish } from "@/lib/realtime";
import { notifyPartner } from "@/lib/notify";
import { coupleAction } from "@/lib/safe-action";

// Relay de los juegos del lienzo por el bus SSE dentro de la pareja (como el
// 4 en raya o el beso de pulgar). Efímero: nada se persiste; los dibujos que
// se guardan van al álbum por su cuenta (createMomentAction). El primer
// "start" manda push si la pareja tiene la app cerrada.

const strokeSchema = z.object({
  id: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  size: z.number().min(0.5).max(48),
  points: z.array(z.number().min(-0.05).max(1.05)).min(2).max(4000)
});

const schema = z.object({
  kind: z.enum(["start", "submit", "quit", "stroke", "clear", "guess", "correct"]),
  mode: z.enum(["together", "guess"]),
  roundId: z.string().min(1).max(64),
  word: z.string().max(60).optional(),
  startAt: z.number().optional(),
  duration: z.number().min(5).max(600).optional(),
  imageUrl: z.string().startsWith("/api/files/").max(1000).optional(),
  stroke: strokeSchema.optional(),
  guess: z.string().max(80).optional()
});

export const drawGameAction = coupleAction<
  [
    input: {
      kind: "start" | "submit" | "quit" | "stroke" | "clear" | "guess" | "correct";
      mode: "together" | "guess";
      roundId: string;
      word?: string;
      startAt?: number;
      duration?: number;
      imageUrl?: string;
      stroke?: import("@/types").CanvasStroke;
      guess?: string;
    }
  ]
>(async ({ user, coupleId, partnerId }, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Jugada no valida" };
  notifyPartner(
    coupleId,
    partnerId,
    { type: "draw:game", payload: { ...parsed.data, byId: user.id, byName: user.name } },
    parsed.data.kind === "start"
      ? {
          title: `${user.name} te reta a dibujar 🎨`,
          body: parsed.data.mode === "together" ? "Dibujad la misma palabra a la vez" : "Adivina lo que dibuja",
          url: "/canvas",
          tag: "near-draw"
        }
      : undefined
  );
  return { ok: true };
});
