"use server";

import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { UPLOAD_ROOT } from "@/lib/storage";
import { coupleAction } from "@/lib/safe-action";
import { signOut } from "@/auth";
import type { ActionResult } from "@/types";

// Borrado de datos y cuentas. Modelo: TODO lo compartido cuelga del Couple con
// onDelete: Cascade, y User.couple es SetNull. Así que borrar el Couple limpia
// de una vez todo lo vuestro y deja a los dos sueltos. Irreversible; por eso la
// UI exige confirmación explícita y recomienda exportar antes (ver /api/export).

// Limpieza best-effort de los archivos locales de la pareja (fotos, audios).
// En modo S3 la carpeta no existe y force:true no se queja.
async function cleanupCoupleFiles(coupleId: string) {
  try {
    await rm(path.join(UPLOAD_ROOT, coupleId), { recursive: true, force: true });
  } catch {
    // sin ruido: los datos ya están borrados; los archivos son secundarios
  }
}

// Desvincularse = disolver el espacio compartido. Se borra para los DOS: es lo
// honesto en una ruptura (nadie se queda con la intimidad del otro).
export const dissolveCoupleAction = coupleAction<[confirm: string]>(
  async ({ coupleId }, confirm) => {
    if (confirm.trim().toUpperCase() !== "DESVINCULAR") {
      return { ok: false, error: "Escribe DESVINCULAR para confirmar" };
    }
    await prisma.couple.delete({ where: { id: coupleId } });
    await cleanupCoupleFiles(coupleId);
    return { ok: true };
  }
);

// Borrar mi cuenta: disuelve el espacio compartido (si lo hay) y elimina mi
// usuario (cascada de lo mío: sesiones, suscripciones push, logros…). signOut
// cierra la sesión y redirige a /login.
export async function deleteAccountAction(confirm: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No has iniciado sesión" };
  if (confirm.trim().toUpperCase() !== "BORRAR") {
    return { ok: false, error: "Escribe BORRAR para confirmar" };
  }
  if (user.coupleId) {
    await prisma.couple.delete({ where: { id: user.coupleId } }).catch(() => undefined);
    await cleanupCoupleFiles(user.coupleId);
  }
  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await signOut({ redirectTo: "/login" });
  return { ok: true }; // inalcanzable: signOut redirige
}
