import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { toChatMessage } from "@/lib/chat";
import { spotifyEnabled, isSpotifyConnected } from "@/lib/spotify";
import { DateRoom } from "@/features/dateroom/date-room";

export const metadata: Metadata = { title: "Date Room" };
export const dynamic = "force-dynamic";

export default async function DateRoomPage() {
  const { user, couple, partner } = await requireCouple();

  const musicOn = spotifyEnabled();
  const [state, rows, myConnected, partnerConnected] = await Promise.all([
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
    }),
    musicOn ? isSpotifyConnected(user.id) : Promise.resolve(false),
    musicOn && partner ? isSpotifyConnected(partner.id) : Promise.resolve(false)
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
          videoTitle: state.videoTitle,
          playing: state.playing,
          positionSec: state.positionSec,
          updatedAt: state.updatedAt.toISOString()
        }}
        initialMessages={rows.reverse().map(toChatMessage)}
        initialMode={state.mode === "COMPANION" ? "COMPANION" : "YOUTUBE"}
        initialPlatform={state.platform}
        initialTitle={state.sessionTitle}
        music={musicOn ? { connected: myConnected, partnerConnected } : null}
      />
    </div>
  );
}
