import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, CalendarHeart, StickyNote, Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/couple";
import { JoinRedeem } from "@/features/onboarding/join-redeem";

export const metadata: Metadata = { title: "Únete en Near" };
export const dynamic = "force-dynamic";

type InvitePrep = { anniversary?: string; note?: string; welcomeLetter?: string };

export default async function JoinPage({ params }: { params: { code: string } }) {
  const code = params.code.trim().toUpperCase();
  const user = await getCurrentUser();
  if (user?.coupleId) redirect("/home");

  const invite = /^NEAR-[A-Z0-9]{6}$/.test(code)
    ? await prisma.invite.findUnique({
        where: { code },
        include: { inviter: { select: { name: true, coupleId: true } } }
      })
    : null;

  const valid =
    invite &&
    invite.status === "PENDING" &&
    invite.expiresAt > new Date() &&
    !invite.inviter.coupleId;
  const inviterName = invite?.inviter.name ?? null;
  const prep = (invite?.prep ?? null) as InvitePrep | null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
          <Heart className="h-7 w-7 fill-current" />
        </span>
        {valid ? (
          <>
            <h1 className="mt-5 font-display text-3xl text-ink">
              {inviterName} te invita a Near
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              Near es un espacio para dos: vuestro hogar cuando la distancia se
              interpone. Al entrar, vuestras cuentas quedan vinculadas.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-3xl text-ink">Este enlace ya no vale</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              La invitación ha caducado o ya se usó. Pídele a quien te invitó que
              genere una nueva.
            </p>
          </>
        )}
      </div>

      {/* lo que han preparado mientras esperaban */}
      {valid && prep && (prep.anniversary || prep.note || prep.welcomeLetter) && (
        <div className="mt-6 space-y-2 rounded-2xl border border-rose/15 bg-rose-faint/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-deep">
            {inviterName} ya ha ido preparando cosas
          </p>
          {prep.anniversary && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <CalendarHeart className="h-4 w-4 shrink-0 text-rose" /> Vuestra fecha juntos
            </p>
          )}
          {prep.note && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <StickyNote className="h-4 w-4 shrink-0 text-rose" /> Una nota esperándote
            </p>
          )}
          {prep.welcomeLetter && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <Mail className="h-4 w-4 shrink-0 text-rose" /> Una carta de bienvenida
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        {!valid ? (
          <Link
            href="/register"
            className="block rounded-xl bg-rose px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-rose-deep"
          >
            Crear mi cuenta
          </Link>
        ) : user ? (
          <JoinRedeem code={code} inviterName={inviterName ?? "tu pareja"} />
        ) : (
          <div className="space-y-3">
            <Link
              href={`/register?invite=${code}`}
              className="block rounded-xl bg-rose px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-rose-deep"
            >
              Crear cuenta y unirme
            </Link>
            <Link
              href={`/login?invite=${code}`}
              className="block rounded-xl border border-sand-deep bg-paper px-4 py-3 text-center text-sm font-medium text-ink transition hover:bg-sand"
            >
              Ya tengo cuenta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
