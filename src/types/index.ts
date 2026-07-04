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
  videoTitle: string | null;
  playing: boolean;
  positionSec: number;
  updatedAt: string;
};

export type CallSignalKind =
  | "ring"
  | "accept"
  | "decline"
  | "offer"
  | "answer"
  | "ice"
  | "hangup";

export type CompanionSignalKind = "ready" | "go" | "pause" | "resume";

// Todos los eventos del bus SSE como union discriminada: publish() y los
// consumidores comparten el mismo contrato y el compilador delata payloads
// inconsistentes. Anadir un evento = anadir un miembro aqui.
export type StreamEvent =
  | { type: "connected" }
  | { type: "ping" }
  | { type: "message:new"; payload: ChatMessage }
  | {
      type: "message:reaction";
      payload: { messageId: string; reactions: ChatMessage["reactions"] };
    }
  | { type: "presence"; payload: { userId: string; presence: string } }
  | { type: "mood"; payload: { userId: string; mood: string } }
  | { type: "nudge"; payload: { id: string; fromId: string; fromName: string } }
  | { type: "nudge:seen"; payload: { nudgeId: string; byId: string } }
  | { type: "note"; payload: { authorId: string } }
  | { type: "prompt"; payload: { userId: string } }
  | { type: "event"; payload: { byId: string } }
  | { type: "moment"; payload: { authorId: string } }
  | { type: "box:opened"; payload: { by: string; kind: string; content: string } }
  | { type: "season"; payload: { userId: string } }
  | { type: "game:score"; payload: { userId: string; gameKey: string; score: number } }
  | { type: "quiz"; payload: { userId: string } }
  | { type: "dateroom:update"; payload: DateRoomDto & { byId: string } }
  | {
      type: "room:mode";
      payload: {
        mode: "YOUTUBE" | "COMPANION";
        platform?: string;
        sessionTitle?: string | null;
        byId: string;
      };
    }
  | {
      type: "companion:signal";
      payload: { kind: CompanionSignalKind; byId: string; byName: string; at: number };
    }
  | {
      type: "call:signal";
      payload: { fromId: string; fromName: string; kind: CallSignalKind; data: string | null };
    };

export type StreamEventType = StreamEvent["type"];

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type FormState = { error?: string; success?: string };
