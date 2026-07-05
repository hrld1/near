import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { Connect4 } from "@/features/play/connect4";

export const metadata: Metadata = { title: "4 en raya" };
export const dynamic = "force-dynamic";

export default async function Connect4Page() {
  const { user, partner } = await requireCouple();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Connect4 myId={user.id} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
