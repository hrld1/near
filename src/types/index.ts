export type ChatMessage = {
  id: string;
  senderId: string;
  channel: "MAIN" | "DATE_ROOM";
  kind: "TEXT" | "IMAGE" | "VOICE";
  body: string | null;
  attachmentUrl: string | null;
  durationSeconds: number | null;
  createdAt: string;
  reactions: { emoji: string; userId: string }[];
};

export type MemberInfo = {
  id: string;
  name: string;
  image: string | null;
};

export type DateRoomDto = {
  videoId: string | null;
  playing: boolean;
  positionSec: number;
  updatedAt: string;
};

export type StreamEvent = {
  type: string;
  payload?: unknown;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type FormState = { error?: string; success?: string };
