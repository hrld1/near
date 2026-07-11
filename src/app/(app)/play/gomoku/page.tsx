import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Gomoku } from "@/features/play/duel/gomoku";

export const metadata: Metadata = { title: "5 en raya" };
export const dynamic = "force-dynamic";

export default async function GomokuPage() {
  const { user, partner } = await requireCouple();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Gomoku myId={user.id} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
