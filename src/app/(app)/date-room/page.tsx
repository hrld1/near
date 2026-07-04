import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { toChatMessage } from "@/lib/chat";
import { DateRoom } from "@/features/dateroom/date-room";

export const metadata: Metadata = { title: "Date Room" };
export const dynamic = "force-dynamic";

export default async function DateRoomPage() {
  const { user, couple, partner } = await requireCouple();

  const [state, rows] = await Promise.all([
    prisma.dateRoomState.upsert({
      where: { coupleId: couple.id },
      update: {},
      create: { coupleId: couple.id }
    }),
    prisma.message.findMany({
      where: { coupleId: couple.id, channel: "DATE_ROOM" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reactions: true }
    })
  ]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-4.5rem)] max-w-6xl flex-col px-4 py-5 md:h-dvh md:px-8 md:py-8">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">Date Room</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Vuestra sala para pasar tiempo juntos: una peli, un video, una charla.
        </p>
      </header>
      <DateRoom
        me={{ id: user.id, name: user.name, image: user.image }}
        partner={partner ? { id: partner.id, name: partner.name, image: partner.image } : null}
        initialState={{
          videoId: state.videoId,
          playing: state.playing,
          positionSec: state.positionSec,
          updatedAt: state.updatedAt.toISOString()
        }}
        initialMessages={rows.reverse().map(toChatMessage)}
        initialMode={state.mode === "COMPANION" ? "COMPANION" : "YOUTUBE"}
        initialPlatform={state.platform}
        initialTitle={state.sessionTitle}
      />
    </div>
  );
}
