"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { isUserOnline, publish } from "@/lib/realtime";
import { sendPushToUsers } from "@/lib/push";
import { inviteCode } from "@/lib/utils";
import { inviteCodeSchema } from "@/lib/validators";
import { coupleAction } from "@/lib/safe-action";
import type { ActionResult, FormState } from "@/types";

const INVITE_DAYS = 7;

export async function createInviteAction(): Promise<ActionResult<{ code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesion" };
  if (user.coupleId) return { ok: false, error: "Ya tienes pareja vinculada" };

  const existing = await prisma.invite.findFirst({
    where: { inviterId: user.id, status: "PENDING", expiresAt: { gt: new Date() } }
  });
  if (existing) return { ok: true, data: { code: existing.code } };

  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invite = await prisma.invite.create({
        data: { code: inviteCode(), inviterId: user.id, expiresAt }
      });
      return { ok: true, data: { code: invite.code } };
    } catch {
      // colision de codigo: reintenta
    }
  }
  return { ok: false, error: "No se pudo generar el codigo, intentalo de nuevo" };
}

export async function redeemInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No has iniciado sesion" };
  if (user.coupleId) return { error: "Ya tienes pareja vinculada" };

  const parsed = inviteCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invite = await prisma.invite.findUnique({
    where: { code: parsed.data.code },
    include: { inviter: true }
  });

  if (!invite || invite.status !== "PENDING") return { error: "Ese codigo no existe o ya se uso" };
  if (invite.expiresAt < new Date()) return { error: "El codigo ha caducado, pide uno nuevo" };
  if (invite.inviterId === user.id) return { error: "Ese codigo es tuyo: compartelo con tu pareja" };
  if (invite.inviter.coupleId) return { error: "Esa persona ya esta vinculada con alguien" };

  await prisma.$transaction(async (tx) => {
    // el dia compartido de la pareja arranca en la zona de quien invito
    const couple = await tx.couple.create({ data: { timezone: invite.inviter.timezone } });
    await tx.user.update({ where: { id: invite.inviterId }, data: { coupleId: couple.id } });
    await tx.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
    await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    await tx.dateRoomState.create({ data: { coupleId: couple.id } });
  });

  // quien invito aun no tenia pareja, asi que no tiene stream SSE abierto:
  // si no esta con la app delante, el push es la unica forma de enterarse
  if (!isUserOnline(invite.inviterId)) {
    void sendPushToUsers([invite.inviterId], {
      title: `${user.name} ha aceptado tu invitacion 💞`,
      body: "Vuestro hogar en Near ya esta listo.",
      url: "/home"
    });
  }

  revalidatePath("/", "layout");
  redirect("/home");
}

// Aniversario de la pareja: dato compartido, cualquiera de los dos lo edita.
// Cadena vacia = quitarlo.
export const setAnniversaryAction = coupleAction<[dateStr: string]>(
  async ({ user, coupleId }, dateStr) => {
    if (dateStr === "") {
      await prisma.couple.update({ where: { id: coupleId }, data: { anniversary: null } });
    } else {
      const date = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(date.getTime())) return { ok: false, error: "Fecha no valida" };
      if (date > new Date()) return { ok: false, error: "El aniversario no puede ser futuro" };
      await prisma.couple.update({ where: { id: coupleId }, data: { anniversary: date } });
    }
    publish(coupleId, { type: "event", payload: { byId: user.id } });
    revalidatePath("/home");
    revalidatePath("/calendar");
    revalidatePath("/settings");
    return { ok: true };
  }
);
