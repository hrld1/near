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
  | "hangup"
  // modo dormir juntos: informativo (la pantalla se atenua en local) y
  // "goodnight" cierra la llamada con un latido en ambos lados
  | "sleep"
  | "wake"
  | "goodnight"
  // compartir pantalla (it33-audit): "on"/"off" va en `data` como JSON
  // {on: boolean} — solo avisa al otro para que muestre el aviso, la propia
  // imagen ya llega por el track de vídeo sustituido en la conexión.
  | "screen";

// Trazo del lienzo compartido: puntos normalizados 0..1 intercalados x,y.
export type CanvasStroke = {
  id: string;
  color: string;
  size: number;
  points: number[];
};

export type CanvasOp =
  | { kind: "stroke"; stroke: CanvasStroke }
  | { kind: "clear" };

export type CompanionSignalKind = "ready" | "go" | "pause" | "resume";

// Todos los eventos del bus SSE como union discriminada: publish() y los
// consumidores comparten el mismo contrato y el compilador delata payloads
// inconsistentes. Añadir un evento = añadir un miembro aquí.
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
    }
  | {
      type: "c4:signal";
      payload: {
        kind: "invite" | "accept" | "move" | "quit";
        byId: string;
        byName: string;
        seed?: number;
        col?: number;
      };
    }
  // --- iteracion 6 ---
  // efimero: "esta escribiendo" en el chat (no se persiste)
  | { type: "chat:typing"; payload: { userId: string; channel: "MAIN" | "DATE_ROOM" } }
  // el receptor abrio el chat: el emisor pinta "Visto"
  | { type: "chat:seen"; payload: { userId: string; at: string } }
  // transicion de conexión SSE (0<->1 conexiones): punto "en Near ahora"
  | { type: "online"; payload: { userId: string; online: boolean } }
  // beso de pulgar: presencia y posición del dedo (normalizada 0..1)
  | {
      type: "touch:signal";
      payload: {
        kind: "join" | "leave" | "move" | "invite";
        userId: string;
        name: string;
        x?: number;
        y?: number;
        pressing?: boolean;
      };
    }
  // lienzo compartido: trazos y limpiado
  | { type: "canvas:op"; payload: { byId: string; op: CanvasOp } }
  // foto del día nueva
  | { type: "photo:new"; payload: { userId: string; imageUrl: string; caption: string | null } }
  // una carta ha quedado entregada para toId
  | { type: "letter:delivered"; payload: { toId: string } }
  // sync de música (Spotify): estado del lider hacia el seguidor
  | {
      type: "music:sync";
      payload: {
        byId: string;
        trackUri: string | null;
        trackName: string | null;
        artists: string | null;
        albumArt: string | null;
        positionMs: number;
        playing: boolean;
        at: number;
      };
    }
  // --- iteracion 8 ---
  // co-presencia en la ventana "Estar juntos" (mirando el mismo cielo)
  | { type: "together:here"; payload: { userId: string; here: boolean } }
  // --- iteracion 14 ---
  // Hundir la flota en vivo (por turnos; el defensor resuelve cada disparo)
  | {
      type: "bs:signal";
      payload: {
        kind: "invite" | "accept" | "fire" | "result" | "quit" | "rematch";
        byId: string;
        byName: string;
        seed?: number;
        r?: number;
        c?: number;
        hit?: boolean;
        sunk?: string[];
        allSunk?: boolean;
      };
    }
  // --- iteracion 16 ---
  // Arnés genérico de duelos 1v1 por turnos (5 en raya, Reversi, Puntos y
  // cajas...). Un solo evento para todos: `game` discrimina el juego. La
  // jugada viaja como un array corto de enteros (coordenadas) y AMBOS clientes
  // aplican el mismo reducer puro, así que los dos tableros avanzan igual.
  | {
      type: "duel:signal";
      payload: {
        game: string;
        kind: "invite" | "accept" | "move" | "quit";
        byId: string;
        byName: string;
        seed?: number;
        move?: number[];
      };
    }
  // Duelo en vivo de un juego de puntuación: ambos juegan la misma prueba a la
  // vez y se retransmite el marcador para la barra "vs". `score` viaja en
  // "score" (en vivo, limitado) y en "done" (final).
  | {
      type: "race:signal";
      payload: {
        game: string;
        kind: "invite" | "accept" | "score" | "done" | "quit" | "rematch";
        byId: string;
        byName: string;
        seed?: number;
        score?: number;
      };
    }
  // --- iteracion 22: Cerca de verdad ---
  // un aprecio nuevo cae en el frasco de la pareja, en vivo
  | { type: "appreciation:new"; payload: { id: string; fromId: string; fromName: string; body: string } }
  // --- iteracion 24: Coincidir ---
  // alguien cambió sus franjas libres: la otra vista se refresca
  | { type: "free:changed"; payload: { byId: string } }
  // --- iteracion 25: Citas con IA ---
  // se propuso/aceptó/borró un plan de cita: refrescar /citas y calendario
  | { type: "cita:update"; payload: { byId: string } }
  // --- iteracion 23: Reparar ---
  // gestos en caliente para cerrar bien una discusion (efimeros):
  // pause = "necesito un respiro"; reach = tender la mano (con frase);
  // accept = aceptar la mano; aftermath = "he compartido como me senti".
  | {
      type: "repair:signal";
      payload: { kind: "pause" | "reach" | "accept" | "aftermath"; byId: string; byName: string; message?: string };
    }
  // --- iteracion 11 ---
  // juegos del lienzo: "dibujad a la vez" (blind duel) y "dibuja y adivina".
  // Efímero, relay por el bus. En "guess" la palabra NO viaja (es secreta
  // para quien adivina); solo el que dibuja la conoce y valida el acierto.
  | {
      type: "draw:game";
      payload: {
        kind: "start" | "submit" | "quit" | "stroke" | "clear" | "guess" | "correct";
        mode: "together" | "guess";
        byId: string;
        byName: string;
        roundId: string;
        word?: string;
        startAt?: number;
        duration?: number;
        imageUrl?: string;
        stroke?: CanvasStroke;
        guess?: string;
      };
    };

export type StreamEventType = StreamEvent["type"];

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type FormState = { error?: string; success?: string };
