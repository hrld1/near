import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Reversi } from "@/features/play/duel/reversi";

export const metadata: Metadata = { title: "Reversi" };
export const dynamic = "force-dynamic";

export default async function ReversiPage() {
  const { user, partner } = await requireCouple();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Reversi myId={user.id} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
