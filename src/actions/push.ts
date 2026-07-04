"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { coupleAction } from "@/lib/safe-action";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(300).optional()
});

// Alta (o traspaso) de una suscripcion push de este dispositivo. El endpoint
// es unico global: si otro usuario lo registro antes en este navegador, se
// reasigna al usuario actual.
export const subscribePushAction = coupleAction<
  [input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }]
>(async ({ user }, input) => {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Suscripcion no valida" };
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: {
      userId: user.id,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent ?? null
    },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent: parsed.data.userAgent ?? null
    }
  });
  return { ok: true };
});

export const unsubscribePushAction = coupleAction<[endpoint: string]>(
  async ({ user }, endpoint) => {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id }
    });
    return { ok: true };
  }
);
