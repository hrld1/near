import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Battleship } from "@/features/play/battleship";

export const metadata: Metadata = { title: "Hundir la flota" };
export const dynamic = "force-dynamic";

export default async function BattleshipPage() {
  const { user, partner } = await requireCouple();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Battleship myId={user.id} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
