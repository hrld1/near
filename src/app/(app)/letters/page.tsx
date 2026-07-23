import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { requireCouple } from "@/lib/couple";
import { prisma } from "@/lib/db";
import { deliverDueLetters } from "@/lib/letters";
import { LettersView } from "@/features/letters/letters-view";

export const metadata: Metadata = { title: "Cartas" };
export const dynamic = "force-dynamic";

export default async function LettersPage() {
  const { user, couple, partner } = await requireCouple();
  // entrega on-read: cada visita empuja las cartas que ya tocan
  await deliverDueLetters(couple.id);

  const rows = await prisma.letter.findMany({
    where: { coupleId: couple.id },
    orderBy: { createdAt: "desc" },
    take: 60
  });
  const now = Date.now();
  const letters = rows.map((l) => {
    const mine = l.authorId === user.id;
    const delivered = l.deliverAt.getTime() <= now;
    return {
      id: l.id,
      mine,
      kind: (l.kind === "CAPSULE" ? "CAPSULE" : "SLOW") as "SLOW" | "CAPSULE",
      deliverAt: l.deliverAt.toISOString(),
      delivered,
      opened: !!l.openedAt,
      // el cuerpo solo viaja al cliente si es mío o si ya está entregada
      body: mine || delivered ? l.body : null,
      createdAt: l.createdAt.toISOString()
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <Mail className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Cartas</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Lo que escribes hoy llega mañana. La espera es parte del regalo.
        </p>
      </header>
      <LettersView partnerName={partner?.name ?? "tu pareja"} initialLetters={letters} />
    </div>
  );
}
