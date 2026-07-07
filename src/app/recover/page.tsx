import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { RecoverForm } from "@/features/onboarding/recover-form";

export const metadata: Metadata = { title: "Recuperar acceso" };
export const dynamic = "force-dynamic";

// Página pública: la persona bloqueada llega con el enlace que le pasó su
// pareja. Se valida el token aquí (existencia + caducidad) antes de dejar
// poner una contraseña nueva.
export default async function RecoverPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams.token ?? "").trim();
  const row = token ? await prisma.verificationToken.findFirst({ where: { token } }) : null;
  const valid = !!row && row.expires > new Date();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-ink">Recuperar tu acceso</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          {valid
            ? "Elige una contraseña nueva y vuelve a entrar en vuestro espacio."
            : "Este enlace no es válido o ha caducado. Pídele a tu pareja que te genere uno nuevo desde Ajustes."}
        </p>
      </div>

      <div className="mt-8">
        {valid ? (
          <RecoverForm token={token} />
        ) : (
          <Link
            href="/login"
            className="block rounded-xl border border-sand-deep bg-paper px-4 py-3 text-center text-sm font-medium text-ink transition hover:bg-sand"
          >
            Volver a iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
