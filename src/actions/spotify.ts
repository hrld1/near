"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { coupleAction } from "@/lib/safe-action";
import { getCurrentPlayback, playTrack, spotifyEnabled } from "@/lib/spotify";

// El "lider" comparte lo que suena en su Spotify: el servidor lo consulta con
// su token y lo publica por el bus (music:sync). No exponemos el token al
// cliente en ningun momento.
export const broadcastPlaybackAction = coupleAction<[], { playing: boolean; trackName: string | null }>(
  async ({ user, coupleId }) => {
    if (!spotifyEnabled()) return { ok: false, error: "Spotify no esta configurado" };
    const pb = await getCurrentPlayback(user.id);
    if (!pb) return { ok: false, error: "Conecta tu Spotify para compartir lo que suena" };
    publish(coupleId, {
      type: "music:sync",
      payload: {
        byId: user.id,
        trackUri: pb.trackUri,
        trackName: pb.trackName,
        artists: pb.artists,
        albumArt: pb.albumArt,
        positionMs: pb.positionMs,
        playing: pb.playing,
        at: Date.now()
      }
    });
    return { ok: true, data: { playing: pb.playing, trackName: pb.trackName } };
  }
);

const followSchema = z.object({
  trackUri: z.string().startsWith("spotify:track:").max(120),
  positionMs: z.number().min(0).max(86_400_000)
});

// El "seguidor" reproduce en su propio Spotify lo que suena en el lider.
export const followPlaybackAction = coupleAction<[input: { trackUri: string; positionMs: number }]>(
  async ({ user }, input) => {
    if (!spotifyEnabled()) return { ok: false, error: "Spotify no esta configurado" };
    const parsed = followSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Pista no valida" };
    const ok = await playTrack(user.id, parsed.data.trackUri, Math.floor(parsed.data.positionMs));
    if (!ok) {
      return { ok: false, error: "Abre Spotify en un dispositivo (necesita Premium) e intentalo de nuevo" };
    }
    return { ok: true };
  }
);

export const disconnectSpotifyAction = coupleAction<[]>(async ({ user }) => {
  await prisma.spotifyAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/date-room");
  return { ok: true };
});
