import { z } from "zod";
import { requireCoupleAction } from "@/lib/couple";
import { notifyPartner } from "@/lib/notify";
import { DUEL_KEYS } from "@/lib/duels";
import { raceEnabled } from "@/lib/race";

// Señales de duelo que NO deben pasar por una server action (it31).
//
// Next.js serializa las server actions y encola las navegaciones detrás de
// ellas. El marcador de una carrera se manda cada 200 ms: contra localhost
// cada llamada tarda ~5 ms y la cola se vacía sola, pero contra un servidor
// real cada ida y vuelta supera el propio intervalo, así que la cola crece sin
// parar. Medido contra el despliegue: 39 señales encoladas y 14 segundos hasta
// que el navegador conseguía cambiar de página. Es decir, durante un duelo en
// vivo la aplicación entera se quedaba pegada.
//
// Por eso el marcador, el final y el abandono viajan por aquí: un fetch normal
// no entra en esa cola y no bloquea la navegación. Invitar/aceptar/revancha
// siguen siendo server actions — son de baja frecuencia y no compiten con
// nada. El abandono además se manda con sendBeacon (ver lib/quit-beacon.ts),
// porque se emite justo cuando la página se está muriendo.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("arena", [
  z.object({
    arena: z.literal("race"),
    game: z.string().max(20),
    kind: z.enum(["score", "done", "quit"]),
    score: z.number().min(-100_000).max(10_000_000).optional()
  }),
  z.object({
    arena: z.literal("duel"),
    game: z.string().max(20),
    kind: z.literal("quit")
  })
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo no valido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Cuerpo no valido" }, { status: 400 });
  const data = parsed.data;

  // Mismo criterio de validez que las acciones equivalentes.
  const known = data.arena === "race" ? raceEnabled(data.game) : DUEL_KEYS.includes(data.game);
  if (!known) return Response.json({ error: "Juego desconocido" }, { status: 400 });

  let ctx;
  try {
    ctx = await requireCoupleAction();
  } catch {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { user, coupleId, partnerId } = ctx;

  // Sin push en ninguno de estos: quien está al otro lado tiene la pantalla
  // delante por definición. El push solo tiene sentido al invitar.
  const by = { byId: user.id, byName: user.name };
  notifyPartner(
    coupleId,
    partnerId,
    data.arena === "race"
      ? { type: "race:signal", payload: { game: data.game, kind: data.kind, ...by, score: data.score } }
      : { type: "duel:signal", payload: { game: data.game, kind: "quit", ...by } }
  );

  return Response.json({ ok: true });
}
