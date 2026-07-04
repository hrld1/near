"use server";

import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { extractYouTubeId } from "@/lib/utils";
import { playbackSchema } from "@/lib/validators";
import { coupleAction } from "@/lib/safe-action";
import type { CompanionSignalKind, DateRoomDto } from "@/types";

function toDto(state: {
  videoId: string | null;
  videoTitle: string | null;
  playing: boolean;
  positionSec: number;
  updatedAt: Date;
}): DateRoomDto {
  return {
    videoId: state.videoId,
    videoTitle: state.videoTitle,
    playing: state.playing,
    positionSec: state.positionSec,
    updatedAt: state.updatedAt.toISOString()
  };
}

// Titulo del video via oEmbed publico de YouTube (sin API key). Si falla,
// null y tan contentos: es puro azucar.
async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title?.slice(0, 200) ?? null;
  } catch {
    return null;
  }
}

export const setVideoAction = coupleAction<[url: string], DateRoomDto>(
  async ({ user, coupleId }, url) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return { ok: false, error: "Pega un enlace de YouTube valido" };

    const videoTitle = await fetchVideoTitle(videoId);
    const state = await prisma.dateRoomState.upsert({
      where: { coupleId },
      update: { videoId, videoTitle, playing: false, positionSec: 0, updatedById: user.id },
      create: { coupleId, videoId, videoTitle, updatedById: user.id }
    });
    const dto = toDto(state);
    publish(coupleId, { type: "dateroom:update", payload: { ...dto, byId: user.id } });
    return { ok: true, data: dto };
  }
);

export const updatePlaybackAction = coupleAction<
  [input: { playing: boolean; positionSec: number }]
>(async ({ user, coupleId }, input) => {
  const parsed = playbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Estado no valido" };

  const state = await prisma.dateRoomState.upsert({
    where: { coupleId },
    update: { ...parsed.data, updatedById: user.id },
    create: { coupleId, ...parsed.data, updatedById: user.id }
  });
  publish(coupleId, { type: "dateroom:update", payload: { ...toDto(state), byId: user.id } });
  return { ok: true };
});

const COMPANION_PLATFORMS = ["NETFLIX", "HBO", "PRIME", "DISNEY", "SPOTIFY", "OTRO"] as const;

export const setRoomModeAction = coupleAction<
  [input: { mode: "YOUTUBE" | "COMPANION"; platform?: string; sessionTitle?: string }]
>(async ({ user, coupleId }, input) => {
  if (input.mode === "COMPANION") {
    const platform = (input.platform ?? "OTRO").toUpperCase();
    if (!COMPANION_PLATFORMS.includes(platform as (typeof COMPANION_PLATFORMS)[number])) {
      return { ok: false, error: "Plataforma no valida" };
    }
    const title = (input.sessionTitle ?? "").trim().slice(0, 120);
    await prisma.dateRoomState.upsert({
      where: { coupleId },
      update: { mode: "COMPANION", platform, sessionTitle: title || null, updatedById: user.id },
      create: { coupleId, mode: "COMPANION", platform, sessionTitle: title || null, updatedById: user.id }
    });
    publish(coupleId, {
      type: "room:mode",
      payload: { mode: "COMPANION", platform, sessionTitle: title || null, byId: user.id }
    });
  } else {
    await prisma.dateRoomState.upsert({
      where: { coupleId },
      update: { mode: "YOUTUBE", updatedById: user.id },
      create: { coupleId, mode: "YOUTUBE", updatedById: user.id }
    });
    publish(coupleId, { type: "room:mode", payload: { mode: "YOUTUBE", byId: user.id } });
  }
  return { ok: true };
});

// Senales del modo companion (Netflix/HBO/Prime/Spotify): Near NO controla la
// reproduccion externa (sus APIs no lo permiten sin acuerdos/SDKs); esto
// coordina a las dos personas con honestidad: listo / cuenta atras / pausa.
export const companionSignalAction = coupleAction<[kind: CompanionSignalKind]>(
  async ({ user, coupleId }, kind) => {
    if (!["ready", "go", "pause", "resume"].includes(kind)) {
      return { ok: false, error: "Senal no valida" };
    }
    publish(coupleId, {
      type: "companion:signal",
      payload: { kind, byId: user.id, byName: user.name, at: Date.now() }
    });
    return { ok: true };
  }
);
