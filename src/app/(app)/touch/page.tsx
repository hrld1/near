import type { Metadata } from "next";
import { requireCouple } from "@/lib/couple";
import { TouchTogether } from "@/features/touch/touch-together";

export const metadata: Metadata = { title: "Tacto" };
export const dynamic = "force-dynamic";

export default async function TouchPage() {
  const { user, partner } = await requireCouple();
  return (
    <div className="mx-auto h-[calc(100dvh-4.5rem)] max-w-4xl px-4 py-4 md:h-dvh md:px-8 md:py-6">
      <TouchTogether
        me={{ id: user.id, name: user.name, image: user.image }}
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
      />
    </div>
  );
}
