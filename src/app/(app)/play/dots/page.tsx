import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Dots } from "@/features/play/duel/dots";

export const metadata: Metadata = { title: "Puntos y cajas" };
export const dynamic = "force-dynamic";

export default async function DotsPage() {
  const { user, partner } = await requireCouple();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Dots myId={user.id} myName={user.name} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
