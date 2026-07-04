import { getCurrentUser } from "@/lib/couple";
import { subscribe, trackOnline } from "@/lib/realtime";
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
      const untrack = trackOnline(user.id);
      const ping = setInterval(() => send({ type: "ping" }), 25000);
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ping);
        unsubscribe();
        untrack();
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
