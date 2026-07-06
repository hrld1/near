import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { DistanceMap } from "@/features/map/distance-map";

export const metadata: Metadata = { title: "La distancia" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const { user, couple, partner } = await requireCouple();

  // la próxima cita con cuenta atrás marca el "en X días os veis"
  const nextEvent = await prisma.calendarEvent.findFirst({
    where: { coupleId: couple.id, startsAt: { gt: new Date() }, showCountdown: true },
    orderBy: { startsAt: "asc" }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="font-display text-3xl text-ink">La distancia entre vosotros</h1>
        <p className="mt-1 text-sm text-ink-soft">
          El cielo que os separa, en kilómetros y en días. Y el tiempo que hace ahora mismo
          donde está cada uno.
        </p>
      </header>
      <DistanceMap
        myName={user.name}
        partnerName={partner?.name ?? "tu pareja"}
        myCity={user.city}
        partnerCity={partner?.city ?? null}
        nextMeeting={
          nextEvent ? { title: nextEvent.title, startsAt: nextEvent.startsAt.toISOString() } : null
        }
      />
    </div>
  );
}
