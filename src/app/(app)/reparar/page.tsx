import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { RepairMoment } from "@/features/reparar/repair-moment";
import { AftermathTool } from "@/features/reparar/aftermath-tool";

export const metadata: Metadata = { title: "Reparar" };
export const dynamic = "force-dynamic";

export default async function RepararPage() {
  const { user, couple, partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";

  const latest = await prisma.repair.findFirst({
    where: { coupleId: couple.id },
    orderBy: { createdAt: "desc" },
    include: { entries: true }
  });
  const myEntry = latest?.entries.find((e) => e.userId === user.id) ?? null;
  const partnerRaw = partner ? latest?.entries.find((e) => e.userId === partner.id) ?? null : null;
  const toEntry = (e: { feelings: string[]; perspective: string; need: string }) => ({
    feelings: e.feelings,
    perspective: e.perspective,
    need: e.need
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
            <Sprout className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Reparar</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Discutir a distancia duele el doble. Aquí tenéis con qué parar a tiempo, tender la mano y, en calma,
          entenderos.
        </p>
      </header>

      <div className="space-y-6">
        <RepairMoment partnerName={partnerName} />
        <AftermathTool
          partnerName={partnerName}
          initialRepairId={latest?.id ?? null}
          initialMine={myEntry ? toEntry(myEntry) : null}
          initialPartner={myEntry && partnerRaw ? toEntry(partnerRaw) : null}
          partnerAnswered={!!partnerRaw}
        />
      </div>
    </div>
  );
}
