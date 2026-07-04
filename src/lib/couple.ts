import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCouple() {
  const user = await requireUser();
  if (!user.coupleId) redirect("/onboarding");
  const couple = await prisma.couple.findUnique({
    where: { id: user.coupleId },
    include: { members: true }
  });
  if (!couple) redirect("/onboarding");
  const partner = couple.members.find((m) => m.id !== user.id) ?? null;
  return { user, couple, partner };
}

// Variante para server actions: lanza error en vez de redirigir.
// Devuelve tambien el Couple: las actions necesitan couple.timezone para
// calcular el dia compartido (ver src/lib/dates.ts).
export async function requireCoupleAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No has iniciado sesion");
  if (!user.coupleId) throw new Error("Aun no tienes pareja vinculada");
  const couple = await prisma.couple.findUnique({ where: { id: user.coupleId } });
  if (!couple) throw new Error("Aun no tienes pareja vinculada");
  return { user, couple, coupleId: user.coupleId };
}
