"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { coupleAction } from "@/lib/safe-action";
import type { ActionResult } from "@/types";

// Cambiar la contraseña estando dentro (verifica la actual).
export async function changePasswordAction(current: string, next: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesión" };
  if (next.length < 8) return { ok: false, error: "La nueva necesita al menos 8 caracteres" };
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return { ok: false, error: "La contraseña actual no es correcta" };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) }
  });
  return { ok: true };
}

// Recuperación SIN email: tu pareja genera un enlace para ti. Solo quien
// comparte tu espacio puede ayudarte a recuperar el acceso — encaja con el
// modelo de dos personas y no exige infraestructura de correo. Reutiliza
// VerificationToken (la tabla del adapter de Auth, hasta ahora sin uso).
export const createRecoveryTokenForPartnerAction = coupleAction<[], { token: string }>(
  async ({ partnerId }) => {
    if (!partnerId) return { ok: false, error: "No hay pareja a la que ayudar" };
    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await prisma.verificationToken.deleteMany({ where: { identifier: partnerId } });
    await prisma.verificationToken.create({ data: { identifier: partnerId, token, expires } });
    return { ok: true, data: { token } };
  }
);

// Canje del enlace por la persona bloqueada (página pública /recover). No
// requiere sesión: el token es la prueba. Un solo uso y caduca en 1 hora.
export async function redeemRecoveryAction(token: string, next: string): Promise<ActionResult> {
  if (next.length < 8) return { ok: false, error: "La contraseña necesita al menos 8 caracteres" };
  const row = await prisma.verificationToken.findFirst({ where: { token } });
  if (!row || row.expires < new Date()) {
    return { ok: false, error: "El enlace no es válido o ha caducado" };
  }
  await prisma.user.update({
    where: { id: row.identifier },
    data: { passwordHash: await bcrypt.hash(next, 12) }
  });
  await prisma.verificationToken.deleteMany({ where: { identifier: row.identifier } });
  return { ok: true };
}
