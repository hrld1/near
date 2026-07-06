import { isUserOnline, publish } from "@/lib/realtime";
import { sendPushToUsers, type PushPayload } from "@/lib/push";
import type { StreamEvent } from "@/types";

// Fachada unica de notificación: SIEMPRE publica en el bus SSE y, si se
// aporta contenido de push Y el destinatario no tiene ninguna conexión
// abierta Y hay claves VAPID, manda push. realtime.ts sigue siendo un bus
// puro y swappable; las actions solo llaman a esto.
export function notifyPartner(
  coupleId: string,
  partnerId: string | null,
  event: StreamEvent,
  push?: PushPayload
) {
  publish(coupleId, event);
  if (!push || !partnerId) return;
  if (isUserOnline(partnerId)) return;
  void sendPushToUsers([partnerId], push);
}
