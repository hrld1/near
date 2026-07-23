import type { Metadata } from "next";
import { MapPin } from "lucide-react";
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
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <MapPin className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">La distancia entre vosotros</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
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
