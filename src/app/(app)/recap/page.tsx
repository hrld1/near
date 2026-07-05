import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { getMonthlyRecap } from "@/lib/recap";
import { MonthRecap } from "@/features/recap/month-recap";

export const metadata: Metadata = { title: "Vuestro mes" };
export const dynamic = "force-dynamic";

export default async function RecapPage() {
  const { user, couple, partner } = await requireCouple();
  const recap = await getMonthlyRecap(
    couple.id,
    user.id,
    couple.members.map((m) => m.id),
    couple.timezone
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="font-display text-3xl text-ink">Vuestro mes en Near</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Un resumen de lo vuestro este mes. Descárgalo o compártelo.
        </p>
      </header>
      <MonthRecap recap={recap} me={user.name} partner={partner?.name ?? "tu pareja"} />
    </div>
  );
}
