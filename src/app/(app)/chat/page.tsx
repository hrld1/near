import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { presenceInfo, moodInfo } from "@/lib/utils";
import { dayKeyIn } from "@/lib/dates";
import { getCoupleStreak } from "@/lib/engagement";
import { eventIcon } from "@/components/product-icons";
import { Avatar } from "@/components/ui/avatar";
import { ChatRoom } from "@/features/chat/chat-room";
import { PartnerClock } from "@/features/home/partner-clock";
import { toChatMessage } from "@/lib/chat";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { user, couple, partner } = await requireCouple();

  const [rows, nextEvent, streakInfo, partnerMood] = await Promise.all([
    prisma.message.findMany({
      where: { coupleId: couple.id, channel: "MAIN" },
      orderBy: { createdAt: "desc" },
      take: 81,
      include: { reactions: true }
    }),
    prisma.calendarEvent.findFirst({
      where: { coupleId: couple.id, startsAt: { gt: new Date() }, showCountdown: true },
      orderBy: { startsAt: "asc" }
    }),
    getCoupleStreak(couple.id, couple.members.map((m) => m.id), couple.timezone),
    partner
      ? prisma.moodEntry.findFirst({
          where: { userId: partner.id, dateKey: dayKeyIn(partner.timezone) }
        })
      : null
  ]);

  const hasMore = rows.length > 80;
  const messages = rows.slice(0, 80).reverse().map(toChatMessage);
  const partnerPresence = partner ? presenceInfo(partner.presence) : null;
  const daysToEvent = nextEvent
    ? Math.max(0, Math.ceil((nextEvent.startsAt.getTime() - Date.now()) / 86_400_000))
    : null;
  const NextEventIcon = nextEvent ? eventIcon(nextEvent.kind) : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4.5rem)] max-w-3xl flex-col md:h-dvh">
      <LiveRefresh types={["presence", "mood"]} />
      <header className="flex items-center gap-3 border-b border-sand bg-paper/80 px-4 py-2.5 backdrop-blur">
        {partner ? (
          <>
            <span className="relative">
              <Avatar name={partner.name} tone={1} size="md" />
              {partnerPresence && partner.presence !== "NONE" && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper ${partnerPresence.dot}`}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium leading-tight text-ink">
                {partner.name}
                {partnerMood && (
                  <span className="text-sm" title={`Hoy: ${moodInfo(partnerMood.mood).label}`}>
                    {moodInfo(partnerMood.mood).emoji}
                  </span>
                )}
              </p>
              <p className="flex items-center gap-2 text-xs text-ink-soft">
                {partnerPresence && partner.presence !== "NONE" && (
                  <span>{partnerPresence.label}</span>
                )}
                <PartnerClock timezone={partner.timezone} name={partner.name} />
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {streakInfo.streak > 0 && (
                <span
                  title={`Racha de ${streakInfo.streak} dias`}
                  className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400"
                >
                  <Flame className="h-3.5 w-3.5" />
                  {streakInfo.streak}
                </span>
              )}
              {nextEvent && NextEventIcon && daysToEvent !== null && (
                <Link
                  href="/calendar"
                  title={nextEvent.title}
                  className="flex items-center gap-1 rounded-full bg-rose-faint px-2.5 py-1 text-xs font-semibold text-rose-deep transition hover:bg-rose-soft"
                >
                  <NextEventIcon className="h-3.5 w-3.5" />
                  {daysToEvent === 0 ? "hoy" : `${daysToEvent} d`}
                </Link>
              )}
              <Link
                href="/date-room"
                title="Ir a la sala (videollamada)"
                className="rounded-full p-2 text-ink-soft transition hover:bg-sand hover:text-rose-deep"
              >
                <Video className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </>
        ) : (
          <p className="font-medium text-ink">Vuestro chat</p>
        )}
      </header>
      <ChatRoom
        me={{ id: user.id, name: user.name, image: user.image }}
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
        initialMessages={messages}
        channel="MAIN"
        initialHasMore={hasMore}
        trackSeen
      />
    </div>
  );
}
