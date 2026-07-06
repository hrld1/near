import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { dayKeyIn } from "@/lib/dates";
import { isUserOnline } from "@/lib/realtime";
import { LiveRefresh } from "@/components/live-refresh";
import { TogetherWindow } from "@/features/together/together-window";

export const metadata: Metadata = { title: "Estar juntos" };
export const dynamic = "force-dynamic";

export default async function TogetherPage() {
  const { user, partner } = await requireCouple();

  const partnerMood = partner
    ? await prisma.moodEntry.findUnique({
        where: {
          userId_dateKey: { userId: partner.id, dateKey: dayKeyIn(partner.timezone) }
        }
      })
    : null;

  return (
    <>
      {/* el ánimo/estado de la pareja se refresca solo cuando cambian */}
      <LiveRefresh types={["mood", "presence", "note"]} />
      <TogetherWindow
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
        myTimezone={user.timezone}
        partnerTimezone={partner?.timezone ?? user.timezone}
        partnerCity={partner?.city ?? null}
        partnerLat={partner?.latitude ?? null}
        partnerLon={partner?.longitude ?? null}
        partnerPresence={partner?.presence ?? "NONE"}
        partnerPresenceUpdatedAt={partner?.presenceUpdatedAt?.toISOString() ?? null}
        partnerMood={partnerMood?.mood ?? null}
        partnerMoodNote={partnerMood?.note ?? null}
        initialOnline={partner ? isUserOnline(partner.id) : false}
      />
    </>
  );
}
