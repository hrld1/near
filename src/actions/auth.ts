"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { registerSchema, loginSchema } from "@/lib/validators";
import type { FormState } from "@/types";

// Solo permitimos volver a un destino interno seguro. En la practica, el enlace
// /join/[code]: asi tras registrarse/entrar se canjea la invitacion sin pasos.
function safeRedirect(raw: FormDataEntryValue | null, fallback: string): string {
  const value = typeof raw === "string" ? raw : "";
  return /^\/join\/NEAR-[A-Z0-9]{6}$/.test(value) ? value : fallback;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese email" };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeRedirect(formData.get("redirectTo"), "/onboarding")
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "No se pudo iniciar sesion" };
    throw error;
  }
  return {};
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirect(formData.get("redirectTo"), "/home")
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Email o contrasena incorrectos" };
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
