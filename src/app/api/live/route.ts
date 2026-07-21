import { z } from "zod";
import { requireCoupleAction } from "@/lib/couple";
import { notifyPartner } from "@/lib/notify";
import { DUEL_KEYS } from "@/lib/duels";
import { raceEnabled } from "@/lib/race";
import { publish } from "@/lib/realtime";
import { getCurrentPlayback, spotifyEnabled } from "@/lib/spotify";

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
  }),
  // La llamada entera va por aquí, no solo los candidatos ICE: el "ring" se
  // repite cada 4 s mientras suena, así que también es periódico. Los payloads
  // (SDP/ICE) son opacos para el servidor; solo se retransmiten.
  z.object({
    arena: z.literal("call"),
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
  }),
  // Sondeo de la sala de cita: cada 4 s el servidor lee lo que suena y lo
  // difunde. Periódico, luego tampoco puede ser una server action.
  z.object({ arena: z.literal("music") }),
  // Tacto compartido: el movimiento del dedo va a ~10 Hz, el doble de rápido
  // que el marcador de los duelos. Era el caso más grave de todos.
  z.object({
    arena: z.literal("touch"),
    kind: z.enum(["join", "leave", "move"]),
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
    pressing: z.boolean().optional()
  }),
  // Co-presencia de "Estar juntos": el aviso de que me voy se manda cuando la
  // página ya se está cerrando.
  z.object({ arena: z.literal("together"), here: z.boolean() })
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
  if (data.arena === "race" && !raceEnabled(data.game)) {
    return Response.json({ error: "Juego desconocido" }, { status: 400 });
  }
  if (data.arena === "duel" && !DUEL_KEYS.includes(data.game)) {
    return Response.json({ error: "Juego desconocido" }, { status: 400 });
  }

  let ctx;
  try {
    ctx = await requireCoupleAction();
  } catch {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { user, coupleId, partnerId } = ctx;

  if (data.arena === "touch") {
    notifyPartner(coupleId, partnerId, {
      type: "touch:signal",
      payload: {
        kind: data.kind,
        userId: user.id,
        name: user.name,
        x: data.x,
        y: data.y,
        pressing: data.pressing
      }
    });
    return Response.json({ ok: true });
  }

  if (data.arena === "together") {
    publish(coupleId, { type: "together:here", payload: { userId: user.id, here: data.here } });
    return Response.json({ ok: true });
  }

  if (data.arena === "music") {
    if (!spotifyEnabled()) return Response.json({ error: "Spotify no esta configurado" }, { status: 400 });
    const pb = await getCurrentPlayback(user.id);
    if (!pb) {
      return Response.json({ error: "Conecta tu Spotify para compartir lo que suena" }, { status: 400 });
    }
    publish(coupleId, {
      type: "music:sync",
      payload: {
        byId: user.id,
        trackUri: pb.trackUri,
        trackName: pb.trackName,
        artists: pb.artists,
        albumArt: pb.albumArt,
        positionMs: pb.positionMs,
        playing: pb.playing,
        at: Date.now()
      }
    });
    return Response.json({ ok: true });
  }

  if (data.arena === "call") {
    // Única señal con push: el primer "ring" tiene que sonar aunque la pareja
    // tenga la app cerrada. Los re-rings no lo llevan, así que solo hay una
    // notificación por llamada.
    const isInitialRing = data.kind === "ring" && data.initial === true;
    notifyPartner(
      coupleId,
      partnerId,
      {
        type: "call:signal",
        payload: { fromId: user.id, fromName: user.name, kind: data.kind, data: data.data ?? null }
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
    return Response.json({ ok: true });
  }

  // Duelos: sin push, quien está al otro lado tiene la pantalla delante por
  // definición. El push solo tiene sentido al invitar.
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
