"use client";

import { Confetti } from "@/features/play/confetti";
import { duelByKey } from "@/lib/duels";
import {
  DOTS_C,
  DOTS_R,
  dotsClosedBoxes,
  dotsEdgeKey,
  dotsTotalBoxes
} from "@/lib/dots";
import { sfx, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { DuelFrame } from "./duel-frame";
import { useDuel, type DuelBaseState, type DuelSpec } from "./use-duel";

// Puntos y cajas en vivo sobre el arnés. Cerrar una caja da un turno extra
// (el reducer deja `next` en el mismo bando), como en el juego de papel.

type Owner = "me" | "them";
type Move = { o: number; r: number; c: number };
type DState = DuelBaseState & {
  claimed: string[];
  edgeBy: Record<string, Owner>;
  owners: Record<string, Owner>;
  me: number;
  them: number;
  last: string | null;
};

const R = DOTS_R;
const C = DOTS_C;

const spec: DuelSpec<DState, Move> = {
  key: "dots",
  createState: (iStart) => ({
    next: iStart ? "me" : "them",
    winner: null,
    claimed: [],
    edgeBy: {},
    owners: {},
    me: 0,
    them: 0,
    last: null
  }),
  legal: (s, { o, r, c }) => !s.claimed.includes(dotsEdgeKey(o, r, c)),
  applyMove: (s, { o, r, c }, byMe) => {
    const side: Owner = byMe ? "me" : "them";
    const key = dotsEdgeKey(o, r, c);
    if (s.winner || s.next !== side || s.claimed.includes(key)) return s;
    const claimedSet = new Set(s.claimed);
    claimedSet.add(key);
    const owners = { ...s.owners };
    let gained = 0;
    for (const bk of dotsClosedBoxes(claimedSet, o, r, c)) {
      if (!owners[bk]) {
        owners[bk] = side;
        gained++;
      }
    }
    let me = 0;
    let them = 0;
    for (const v of Object.values(owners)) v === "me" ? me++ : them++;
    const over = me + them >= dotsTotalBoxes();
    const next: Owner = gained > 0 ? side : side === "me" ? "them" : "me";
    return {
      next,
      winner: over ? (me > them ? "me" : them > me ? "them" : "draw") : null,
      claimed: [...s.claimed, key],
      edgeBy: { ...s.edgeBy, [key]: side },
      owners,
      me,
      them,
      last: key
    };
  },
  encode: ({ o, r, c }) => [o, r, c],
  decode: ([o, r, c]) => ({ o, r, c })
};

export function Dots({
  myId,
  myName,
  partnerName
}: {
  myId: string;
  myName: string;
  partnerName: string;
}) {
  const meta = duelByKey("dots")!;
  const { phase, state, myTurn, notice, invite, accept, cancel, play } = useDuel(spec, myId);
  const myInitial = (myName.trim()[0] ?? "T").toUpperCase();
  const themInitial = (partnerName.trim()[0] ?? "P").toUpperCase();

  function tapEdge(o: number, r: number, c: number) {
    if (!play({ o, r, c })) return;
    sfx.pad(2);
    vibrate(10);
  }

  const iWon = state.winner === "me";
  const result =
    phase === "over"
      ? {
          text:
            state.winner === "draw"
              ? `Empate a ${state.me} cajas.`
              : iWon
                ? `¡Ganas ${state.me}–${state.them}!`
                : `Gana ${partnerName} ${state.them}–${state.me}...`,
          iWon
        }
      : null;

  const claimedSet = new Set(state.claimed);

  // Construye la rejilla (2R+1)×(2C+1): puntos, aristas y cajas.
  const rows = [];
  for (let i = 0; i <= 2 * R; i++) {
    for (let j = 0; j <= 2 * C; j++) {
      const evenRow = i % 2 === 0;
      const evenCol = j % 2 === 0;
      if (evenRow && evenCol) {
        rows.push(<span key={`d${i}-${j}`} className="m-auto h-1.5 w-1.5 rounded-full bg-ink/40" />);
      } else if (evenRow && !evenCol) {
        // arista horizontal H(r,c)
        const r = i / 2;
        const c = (j - 1) / 2;
        const key = dotsEdgeKey(0, r, c);
        const by = state.edgeBy[key];
        rows.push(
          <button
            key={`h${i}-${j}`}
            disabled={!myTurn || claimedSet.has(key)}
            onClick={() => tapEdge(0, r, c)}
            className="group flex items-center justify-center disabled:cursor-default"
          >
            <span
              className={cn(
                "h-[5px] w-[86%] rounded-full transition",
                by === "me" && "bg-gradient-to-r from-rose to-rose-deep",
                by === "them" && "bg-gradient-to-r from-slate-400 to-slate-700",
                !by && "bg-ink/10 group-enabled:group-hover:bg-rose/50",
                state.last === key && "ring-2 ring-amber-300/80"
              )}
            />
          </button>
        );
      } else if (!evenRow && evenCol) {
        // arista vertical V(r,c)
        const r = (i - 1) / 2;
        const c = j / 2;
        const key = dotsEdgeKey(1, r, c);
        const by = state.edgeBy[key];
        rows.push(
          <button
            key={`v${i}-${j}`}
            disabled={!myTurn || claimedSet.has(key)}
            onClick={() => tapEdge(1, r, c)}
            className="group flex items-center justify-center disabled:cursor-default"
          >
            <span
              className={cn(
                "h-[86%] w-[5px] rounded-full transition",
                by === "me" && "bg-gradient-to-b from-rose to-rose-deep",
                by === "them" && "bg-gradient-to-b from-slate-400 to-slate-700",
                !by && "bg-ink/10 group-enabled:group-hover:bg-rose/50",
                state.last === key && "ring-2 ring-amber-300/80"
              )}
            />
          </button>
        );
      } else {
        // caja (r,c)
        const r = (i - 1) / 2;
        const c = (j - 1) / 2;
        const owner = state.owners[`${r}:${c}`];
        rows.push(
          <span
            key={`b${i}-${j}`}
            className={cn(
              "flex items-center justify-center rounded-[3px] font-display text-sm text-white transition",
              owner === "me" && "animate-pop-in bg-gradient-to-br from-rose to-rose-deep",
              owner === "them" && "animate-pop-in bg-gradient-to-br from-slate-500 to-slate-800",
              !owner && "bg-transparent"
            )}
          >
            {owner === "me" ? myInitial : owner === "them" ? themInitial : ""}
          </span>
        );
      }
    }
  }

  return (
    <DuelFrame
      meta={meta}
      phase={phase}
      notice={notice}
      partnerName={partnerName}
      onInvite={invite}
      onAccept={accept}
      onCancel={cancel}
      result={result}
      onRematch={invite}
    >
      {phase === "over" && iWon && <Confetti />}

      <div className="mb-3 flex items-center justify-between text-sm font-medium">
        <span className={cn("flex items-center gap-2", myTurn && "text-rose-deep")}>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-rose to-rose-deep text-[10px] font-bold text-white">
            {myInitial}
          </span>
          <b className="text-ink">{state.me}</b>
          {myTurn && <span className="text-xs">— te toca</span>}
        </span>
        <span className={cn("flex items-center gap-2", !myTurn && phase === "playing" && "text-slate-500")}>
          {phase === "playing" && !myTurn && <span className="text-xs">pensando...</span>}
          <b className="text-ink">{state.them}</b>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-slate-500 to-slate-800 text-[10px] font-bold text-white">
            {themInitial}
          </span>
        </span>
      </div>

      <div className="mx-auto max-w-[380px] rounded-2xl bg-paper p-4 shadow-lift ring-1 ring-sand-deep">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${C}, 12px 1fr) 12px`,
            gridTemplateRows: `repeat(${R}, 12px 1fr) 12px`
          }}
        >
          {rows}
        </div>
      </div>
    </DuelFrame>
  );
}
