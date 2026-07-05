import { getCurrentUser } from "@/lib/couple";
import { isUserOnline, publish, subscribe, trackOnline } from "@/lib/realtime";
import type { StreamEvent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.coupleId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const coupleId = user.coupleId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };
      send({ type: "connected" });
      const unsubscribe = subscribe(coupleId, send);
      // transiciones 0<->1 conexiones: la pareja ve "en Near ahora" en vivo
      const wasOnline = isUserOnline(user.id);
      const untrack = trackOnline(user.id);
      if (!wasOnline) publish(coupleId, { type: "online", payload: { userId: user.id, online: true } });
      const ping = setInterval(() => send({ type: "ping" }), 25000);
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ping);
        unsubscribe();
        untrack();
        if (!isUserOnline(user.id)) {
          publish(coupleId, { type: "online", payload: { userId: user.id, online: false } });
        }
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      });
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
