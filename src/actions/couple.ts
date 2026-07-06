"use server";

import { z } from "zod";
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

// Preparativos del hogar hechos mientras se espera a la pareja: se guardan en
// Invite.prep y se aplican al canjear el código (ver performRedeem).
type InvitePrep = { anniversary?: string; note?: string; welcomeLetter?: string };

export async function createInviteAction(): Promise<ActionResult<{ code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesión" };
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
      // colision de código: reintenta
    }
  }
  return { ok: false, error: "No se pudo generar el código, intentalo de nuevo" };
}

// Nucleo del canje, compartido por el formulario (pegar código) y el enlace
// /join/[code]. Aplica los preparativos (prep) dentro de la misma transaccion.
async function performRedeem(userId: string, rawCode: unknown): Promise<ActionResult> {
  const parsed = inviteCodeSchema.safeParse({ code: rawCode });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "No has iniciado sesión" };
  if (user.coupleId) return { ok: false, error: "Ya tienes pareja vinculada" };

  const invite = await prisma.invite.findUnique({
    where: { code: parsed.data.code },
    include: { inviter: true }
  });

  if (!invite || invite.status !== "PENDING") return { ok: false, error: "Ese código no existe o ya se uso" };
  if (invite.expiresAt < new Date()) return { ok: false, error: "El código ha caducado, pide uno nuevo" };
  if (invite.inviterId === user.id) return { ok: false, error: "Ese código es tuyo: compártelo con tu pareja" };
  if (invite.inviter.coupleId) return { ok: false, error: "Esa persona ya esta vinculada con alguien" };

  const prep = (invite.prep ?? null) as InvitePrep | null;

  await prisma.$transaction(async (tx) => {
    // el día compartido de la pareja arranca en la zona de quien invito
    const couple = await tx.couple.create({ data: { timezone: invite.inviter.timezone } });
    await tx.user.update({ where: { id: invite.inviterId }, data: { coupleId: couple.id } });
    await tx.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
    await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    await tx.dateRoomState.create({ data: { coupleId: couple.id } });

    // preparativos hechos durante la espera (los firma quien invito)
    if (prep?.anniversary) {
      const d = new Date(`${prep.anniversary}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && d <= new Date()) {
        await tx.couple.update({ where: { id: couple.id }, data: { anniversary: d } });
      }
    }
    if (prep?.note?.trim()) {
      await tx.note.create({
        data: { coupleId: couple.id, authorId: invite.inviterId, body: prep.note.trim().slice(0, 2000) }
      });
    }
    if (prep?.welcomeLetter?.trim()) {
      // carta de bienvenida ya entregada: quien llega la encuentra esperando
      await tx.letter.create({
        data: {
          coupleId: couple.id,
          authorId: invite.inviterId,
          kind: "SLOW",
          body: prep.welcomeLetter.trim().slice(0, 4000),
          deliverAt: new Date()
        }
      });
    }
  });

  // quien invito aún no tenia pareja, así que no tiene stream SSE abierto:
  // si no esta con la app delante, el push es la unica forma de enterarse
  if (!isUserOnline(invite.inviterId)) {
    void sendPushToUsers([invite.inviterId], {
      title: `${user.name} ha aceptado tu invitación 💞`,
      body: "Vuestro hogar en Near ya esta listo.",
      url: "/home"
    });
  }

  return { ok: true };
}

export async function redeemInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No has iniciado sesión" };
  const result = await performRedeem(user.id, formData.get("code"));
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  redirect("/home");
}

// Canje directo desde el enlace /join/[code] (sin pegar nada a mano).
export async function redeemByCodeAction(code: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesión" };
  const result = await performRedeem(user.id, code);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

const prepSchema = z.object({
  anniversary: z.string().max(20).optional(),
  note: z.string().trim().max(2000).optional(),
  welcomeLetter: z.string().trim().max(4000).optional()
});

// Guarda los preparativos del hogar en la invitación mientras se espera.
export async function savePrepAction(code: string, prep: InvitePrep): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesión" };
  const parsed = prepSchema.safeParse(prep);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const invite = await prisma.invite.findFirst({
    where: { code: code.trim().toUpperCase(), inviterId: user.id, status: "PENDING" }
  });
  if (!invite) return { ok: false, error: "Invitación no encontrada" };

  const clean: Record<string, string> = {};
  if (parsed.data.anniversary) clean.anniversary = parsed.data.anniversary;
  if (parsed.data.note) clean.note = parsed.data.note;
  if (parsed.data.welcomeLetter) clean.welcomeLetter = parsed.data.welcomeLetter;

  await prisma.invite.update({ where: { id: invite.id }, data: { prep: clean } });
  return { ok: true };
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
