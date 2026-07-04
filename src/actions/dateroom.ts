"use server";

import { prisma } from "@/lib/db";
import { requireCoupleAction } from "@/lib/couple";
import { publish } from "@/lib/realtime";
import { extractYouTubeId } from "@/lib/utils";
import { playbackSchema } from "@/lib/validators";
import type { ActionResult, DateRoomDto } from "@/types";

function toDto(state: {
  videoId: string | null;
  playing: boolean;
  positionSec: number;
  updatedAt: Date;
}): DateRoomDto {
  return {
    videoId: state.videoId,
    playing: state.playing,
    positionSec: state.positionSec,
    updatedAt: state.updatedAt.toISOString()
  };
}

export async function setVideoAction(url: string): Promise<ActionResult<DateRoomDto>> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const videoId = extractYouTubeId(url);
    if (!videoId) return { ok: false, error: "Pega un enlace de YouTube valido" };

    const state = await prisma.dateRoomState.upsert({
      where: { coupleId },
      update: { videoId, playing: false, positionSec: 0, updatedById: user.id },
      create: { coupleId, videoId, updatedById: user.id }
    });
    const dto = toDto(state);
    publish(coupleId, { type: "dateroom:update", payload: { ...dto, byId: user.id } });
    return { ok: true, data: dto };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function updatePlaybackAction(input: {
  playing: boolean;
  positionSec: number;
}): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    const parsed = playbackSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Estado no valido" };

    const state = await prisma.dateRoomState.upsert({
      where: { coupleId },
      update: { ...parsed.data, updatedById: user.id },
      create: { coupleId, ...parsed.data, updatedById: user.id }
    });
    publish(coupleId, { type: "dateroom:update", payload: { ...toDto(state), byId: user.id } });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

const COMPANION_PLATFORMS = ["NETFLIX", "HBO", "PRIME", "DISNEY", "SPOTIFY", "OTRO"] as const;

export async function setRoomModeAction(input: {
  mode: "YOUTUBE" | "COMPANION";
  platform?: string;
  sessionTitle?: string;
}): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
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
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}

// Senales del modo companion (Netflix/HBO/Prime/Spotify): Near NO controla la
// reproduccion externa (sus APIs no lo permiten sin acuerdos/SDKs); esto
// coordina a las dos personas con honestidad: listo / cuenta atras / pausa.
export async function companionSignalAction(
  kind: "ready" | "go" | "pause" | "resume"
): Promise<ActionResult> {
  try {
    const { user, coupleId } = await requireCoupleAction();
    if (!["ready", "go", "pause", "resume"].includes(kind)) {
      return { ok: false, error: "Senal no valida" };
    }
    publish(coupleId, {
      type: "companion:signal",
      payload: { kind, byId: user.id, byName: user.name, at: Date.now() }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error" };
  }
}
