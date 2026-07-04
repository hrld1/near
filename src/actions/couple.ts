"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { inviteCode } from "@/lib/utils";
import { inviteCodeSchema } from "@/lib/validators";
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
    const couple = await tx.couple.create({ data: {} });
    await tx.user.update({ where: { id: invite.inviterId }, data: { coupleId: couple.id } });
    await tx.user.update({ where: { id: user.id }, data: { coupleId: couple.id } });
    await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    await tx.dateRoomState.create({ data: { coupleId: couple.id } });
  });

  revalidatePath("/", "layout");
  redirect("/home");
}
