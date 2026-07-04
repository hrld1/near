import webpush from "web-push";
import { prisma } from "@/lib/db";

// Envio de Web Push (protocolo VAPID, sin servicios de terceros).
// Sin claves en el entorno, todo degrada a no-op: la app funciona igual.

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:near@example.invalid";

export const pushEnabled = Boolean(publicKey && privateKey);

let configured = false;
function ensureConfigured() {
  if (!configured && pushEnabled) {
    webpush.setVapidDetails(subject, publicKey!, privateKey!);
    configured = true;
  }
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  // mismo tag = las notificaciones se colapsan (p.ej. rafaga de chat)
  tag?: string;
};

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!pushEnabled || userIds.length === 0) return;
  ensureConfigured();
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } }
  });
  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (error) {
        // 404/410 = suscripcion muerta (permiso revocado, navegador
        // reinstalado...): se limpia sola en el siguiente envio.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    })
  );
}
