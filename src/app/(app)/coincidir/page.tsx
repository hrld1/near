import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { futureIntervals, overlapIntervals } from "@/lib/overlap";
import { LiveRefresh } from "@/components/live-refresh";
import { PartnerClock } from "@/features/home/partner-clock";
import { CoincidirBoard } from "@/features/coincidir/coincidir-board";

export const metadata: Metadata = { title: "Coincidir" };
export const dynamic = "force-dynamic";

export default async function CoincidirPage() {
  const { user, couple, partner } = await requireCouple();
  const now = Date.now();

  const slots = await prisma.freeSlot.findMany({
    where: { coupleId: couple.id, endsAt: { gte: new Date(now) } },
    orderBy: { startsAt: "asc" }
  });
  const mine = slots.filter((s) => s.userId === user.id);
  const theirs = partner ? slots.filter((s) => s.userId === partner.id) : [];

  const toIv = (arr: typeof slots) =>
    futureIntervals(arr.map((s) => ({ start: s.startsAt.getTime(), end: s.endsAt.getTime() })), now);
  const overlaps = partner ? overlapIntervals(toIv(mine), toIv(theirs)) : [];

  const toDto = (arr: typeof slots) =>
    arr.map((s) => ({ id: s.id, start: s.startsAt.toISOString(), end: s.endsAt.toISOString() }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <LiveRefresh types={["free:changed", "event"]} />
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
            <CalendarClock className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Coincidir</h1>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
          Marcad cuándo estáis libres y Near encuentra cuándo podéis hablar — en las dos horas.
          {partner && <PartnerClock timezone={partner.timezone} name={partner.name} />}
        </p>
      </header>

      <CoincidirBoard
        myName={user.name}
        partnerName={partner?.name ?? "tu pareja"}
        myTz={user.timezone}
        partnerTz={partner?.timezone ?? user.timezone}
        mySlots={toDto(mine)}
        partnerSlots={toDto(theirs)}
        overlaps={overlaps.map((o) => ({ start: new Date(o.start).toISOString(), end: new Date(o.end).toISOString() }))}
      />
    </div>
  );
}
