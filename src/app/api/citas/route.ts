import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { AI_DAILY_LIMIT, AI_MODEL, aiEnabled, getAnthropic } from "@/lib/ai";
import { buildCitasSystem, GUARDAR_CITA_TOOL, planSchema, type CitasContext } from "@/lib/citas";
import { dayKeyIn } from "@/lib/dates";
import { dayInTz, timeInTz } from "@/lib/format";
import { futureIntervals, overlapIntervals } from "@/lib/overlap";

// La planificadora de citas: chat con streaming (SSE) sobre la API de Claude.
// Dormida sin ANTHROPIC_API_KEY (503). La conversación viaja del cliente y NO
// se persiste; solo el plan final (si se guarda) toca la base de datos.
// Protocolo de salida: eventos {type: "text"|"plan"|"error"|"done"}.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000)
      })
    )
    .min(1)
    .max(40)
});

const MAX_TURNS = 8; // vueltas del bucle de herramientas por petición

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return Response.json(
      { error: "La planificadora no está activada en esta instancia de Near." },
      { status: 503 }
    );
  }
  const user = await getCurrentUser();
  if (!user?.coupleId) return Response.json({ error: "No autorizado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Mensajes no válidos" }, { status: 400 });
  }

  const couple = await prisma.couple.findUnique({
    where: { id: user.coupleId },
    include: { members: true }
  });
  if (!couple) return Response.json({ error: "No autorizado" }, { status: 401 });
  const partner = couple.members.find((m) => m.id !== user.id) ?? null;

  // límite diario de mensajes por pareja (control de gasto)
  const dateKey = dayKeyIn(couple.timezone);
  const usage = await prisma.aiUsage.upsert({
    where: { coupleId_dateKey: { coupleId: couple.id, dateKey } },
    update: { count: { increment: 1 } },
    create: { coupleId: couple.id, dateKey, count: 1 }
  });
  if (usage.count > AI_DAILY_LIMIT) {
    return Response.json(
      { error: "Habéis llegado al límite de hoy con la planificadora. Mañana más 💛" },
      { status: 429 }
    );
  }

  // contexto: calendario próximo + franjas libres en común (Coincidir)
  const now = new Date();
  const [events, slots] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { coupleId: couple.id, startsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      take: 3
    }),
    prisma.freeSlot.findMany({
      where: { coupleId: couple.id, endsAt: { gte: now } },
      orderBy: { startsAt: "asc" }
    })
  ]);
  const iv = (uid: string) =>
    futureIntervals(
      slots.filter((s) => s.userId === uid).map((s) => ({ start: s.startsAt.getTime(), end: s.endsAt.getTime() })),
      now.getTime()
    );
  const overlaps = partner ? overlapIntervals(iv(user.id), iv(partner.id)).slice(0, 3) : [];

  const ctx: CitasContext = {
    me: { name: user.name, city: user.city, timezone: user.timezone, lat: user.latitude, lon: user.longitude },
    partner: partner
      ? { name: partner.name, city: partner.city, timezone: partner.timezone, lat: partner.latitude, lon: partner.longitude }
      : null,
    todayKey: dateKey,
    anniversary: couple.anniversary ? couple.anniversary.toISOString().slice(0, 10) : null,
    upcomingEvents: events.map((e) => ({
      title: e.title,
      whenLocal: `${dayInTz(e.startsAt, user.timezone)} ${timeInTz(e.startsAt, user.timezone)}`
    })),
    overlaps: overlaps.map((o) => ({
      dayLabel: dayInTz(new Date(o.start), user.timezone),
      myRange: `${timeInTz(new Date(o.start), user.timezone)}–${timeInTz(new Date(o.end), user.timezone)}`,
      partnerRange: partner
        ? `${timeInTz(new Date(o.start), partner.timezone)}–${timeInTz(new Date(o.end), partner.timezone)}`
        : ""
    }))
  };
  const system = buildCitasSystem(ctx);

  const convo: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // cliente desconectado
        }
      };
      let totalIn = 0;
      let totalOut = 0;
      let totalCacheRead = 0;
      let totalCacheWrite = 0;
      let turnsUsed = 0;
      try {
        const anthropic = getAnthropic();
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          turnsUsed = turn + 1;
          const msgStream = anthropic.messages.stream({
            model: AI_MODEL,
            // Sonnet 5 comparte max_tokens entre pensar y responder: con
            // pensamiento activo, 8192 se quedaba corto y podía cortar el
            // plan a medias. display "omitido" (el defecto) porque no se
            // muestra al usuario — solo interesa el texto y la herramienta.
            max_tokens: 16000,
            thinking: { type: "adaptive" },
            output_config: { effort: "high" },
            // El bucle de abajo reenvía TODA la conversación acumulada en cada
            // vuelta, y los resultados de búsqueda son lo más pesado que lleva.
            // Con caché, cada vuelta relee lo que escribió la anterior a una
            // décima parte del precio. Es de lejos el mayor ahorro aquí: el
            // ida y vuelta de preguntas con la pareja es calderilla al lado
            // del bucle de búsquedas dentro de una sola petición.
            cache_control: { type: "ephemeral" },
            system,
            messages: convo,
            tools: [
              // 3 en vez de 5: cada búsqueda engorda el contexto de TODAS las
              // vueltas siguientes, así que el coste de una búsqueda de más no
              // es lineal. Con 3 hay de sobra para una cita.
              { type: "web_search_20260209", name: "web_search", max_uses: 3 },
              GUARDAR_CITA_TOOL
            ]
          });
          for await (const event of msgStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ type: "text", text: event.delta.text });
            }
          }
          const msg = await msgStream.finalMessage();

          // Consumo real por vuelta, para dejar de estimar el coste a ojo.
          // `cache_read` a cero vuelta tras vuelta significa que la caché no
          // está entrando y hay que mirar por qué. Sin datos de la pareja: solo
          // números.
          const u = msg.usage;
          totalIn += u.input_tokens;
          totalOut += u.output_tokens;
          totalCacheRead += u.cache_read_input_tokens ?? 0;
          totalCacheWrite += u.cache_creation_input_tokens ?? 0;

          // la búsqueda web (server tool) puede pausar el turno: se reanuda
          if (msg.stop_reason === "pause_turn") {
            convo.push({ role: "assistant", content: msg.content });
            continue;
          }
          if (msg.stop_reason === "tool_use") {
            convo.push({ role: "assistant", content: msg.content });
            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const block of msg.content) {
              if (block.type !== "tool_use") continue;
              if (block.name === "guardar_cita") {
                const plan = planSchema.safeParse(block.input);
                if (plan.success) {
                  send({ type: "plan", plan: plan.data });
                  results.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content:
                      "La tarjeta del plan ya se muestra al usuario. Remátalo con UNA línea cálida ofreciendo cambiar lo que quieran."
                  });
                } else {
                  const issue = plan.error.issues[0];
                  results.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Plan no válido (${issue.path.join(".")}: ${issue.message}). Corrígelo y vuelve a llamar a guardar_cita.`,
                    is_error: true
                  });
                }
              } else {
                results.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: "Herramienta no disponible.",
                  is_error: true
                });
              }
            }
            convo.push({ role: "user", content: results });
            continue;
          }
          break; // end_turn (o max_tokens): terminamos
        }
      } catch (err) {
        console.error("[citas] error:", err);
        send({ type: "error", error: "La planificadora se ha atascado. Prueba otra vez en un momento." });
      } finally {
        // Sonnet 5: 3 $/M entrada, 15 $/M salida; lo leído de caché va a una
        // décima parte. Precio a mano y no de una tabla porque cambia — sirve
        // como orden de magnitud, no como factura.
        const coste = (totalIn * 3 + totalCacheWrite * 3.75 + totalCacheRead * 0.3 + totalOut * 15) / 1_000_000;
        console.log(
          `[citas] vueltas=${turnsUsed} entrada=${totalIn} cache_lee=${totalCacheRead} cache_escribe=${totalCacheWrite} salida=${totalOut} ~${coste.toFixed(4)}$`
        );
        send({ type: "done" });
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
