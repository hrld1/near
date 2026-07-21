import { z } from "zod";
import { requireCoupleAction } from "@/lib/couple";
import { notifyPartner } from "@/lib/notify";
import { DUEL_KEYS } from "@/lib/duels";
import { raceEnabled } from "@/lib/race";

// Abandono de un duelo al SALIR de la página (it31). Existe por una razón muy
// concreta: el aviso se manda al desmontarse el componente, justo mientras el
// navegador navega a otra parte, y una server action normal se queda a medias
// — el navegador cancela la petición en vuelo. En local no se notaba (latencia
// ~0), pero contra el despliegue real la pareja se quedaba mirando una barra
// "vs" congelada sin enterarse de que el otro se había ido.
//
// `navigator.sendBeacon` está pensado para exactamente esto: el navegador se
// compromete a entregar la petición aunque la página muera. Pero solo sabe
// hacer POST a una URL, no invocar una server action; de ahí esta ruta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  arena: z.enum(["race", "duel"]),
  game: z.string().max(20)
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo no valido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Cuerpo no valido" }, { status: 400 });
  const { arena, game } = parsed.data;

  // Mismo criterio de validez que las acciones equivalentes: un juego que no
  // existe no puede abandonarse.
  const known = arena === "race" ? raceEnabled(game) : DUEL_KEYS.includes(game);
  if (!known) return Response.json({ error: "Juego desconocido" }, { status: 400 });

  let ctx;
  try {
    ctx = await requireCoupleAction();
  } catch {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { user, coupleId, partnerId } = ctx;

  // Sin push: quien se queda está mirando la pantalla por definición.
  notifyPartner(coupleId, partnerId, {
    type: arena === "race" ? "race:signal" : "duel:signal",
    payload: { game, kind: "quit", byId: user.id, byName: user.name }
  });

  return Response.json({ ok: true });
}
