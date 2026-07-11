"use client";

import { Confetti } from "@/features/play/confetti";
import { duelByKey } from "@/lib/duels";
import {
  REVERSI_N,
  reversiCounts,
  reversiFlips,
  reversiInitial,
  reversiLegalMoves,
  rIdx
} from "@/lib/reversi";
import { sfx, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { DuelFrame } from "./duel-frame";
import { useDuel, type DuelBaseState, type DuelSpec } from "./use-duel";

// Reversi (Othello) en vivo sobre el arnés. El reducer es puro y determinista,
// así que ambos clientes voltean lo mismo. Cuando un bando no tiene jugada,
// pasa turno automáticamente (sin evento extra): applyMove ya deja `next` en
// quien sí puede mover, o marca fin de partida.

type Owner = "me" | "them" | null;
type RState = DuelBaseState & {
  cells: Owner[];
  last: number | null;
  me: number;
  them: number;
};

const N = REVERSI_N;

function counts(cells: Owner[]): { me: number; them: number } {
  const { a, b } = reversiCounts<Owner>(cells, "me", "them");
  return { me: a, them: b };
}

const spec: DuelSpec<RState, { at: number }> = {
  key: "reversi",
  createState: (iStart) => {
    const first: Owner = iStart ? "me" : "them";
    const second: Owner = iStart ? "them" : "me";
    const cells = reversiInitial<Owner>(first, second);
    const { me, them } = counts(cells);
    return { next: iStart ? "me" : "them", winner: null, cells, last: null, me, them };
  },
  legal: (s, { at }) => reversiFlips<Owner>(s.cells, at, "me", "them").length > 0,
  applyMove: (s, { at }, byMe) => {
    const side: Owner = byMe ? "me" : "them";
    const opp: Owner = byMe ? "them" : "me";
    if (s.winner || s.next !== side) return s;
    const flips = reversiFlips<Owner>(s.cells, at, side, opp);
    if (flips.length === 0) return s; // ilegal
    const cells = s.cells.slice();
    cells[at] = side;
    for (const f of flips) cells[f] = side;
    const oppCanMove = reversiLegalMoves<Owner>(cells, opp, side).length > 0;
    const sideCanMove = reversiLegalMoves<Owner>(cells, side, opp).length > 0;
    const next: Owner = oppCanMove ? opp : sideCanMove ? side : side;
    const over = !oppCanMove && !sideCanMove;
    const { me, them } = counts(cells);
    let winner: RState["winner"] = null;
    if (over) winner = me > them ? "me" : them > me ? "them" : "draw";
    return { next, winner, cells, last: at, me, them };
  },
  encode: ({ at }) => [at],
  decode: ([at]) => ({ at })
};

export function Reversi({ myId, partnerName }: { myId: string; partnerName: string }) {
  const meta = duelByKey("reversi")!;
  const { phase, state, myTurn, notice, invite, accept, cancel, play } = useDuel(spec, myId);

  const legalSet =
    myTurn && phase === "playing"
      ? new Set(reversiLegalMoves<Owner>(state.cells, "me", "them"))
      : new Set<number>();

  function tap(at: number) {
    if (!legalSet.has(at)) return;
    if (!play({ at })) return;
    sfx.pad(1);
    vibrate(10);
  }

  const iWon = state.winner === "me";
  const result =
    phase === "over"
      ? {
          text:
            state.winner === "draw"
              ? `Empate a ${state.me}. Nadie cede.`
              : iWon
                ? `¡Ganas ${state.me}–${state.them}!`
                : `Gana ${partnerName} ${state.them}–${state.me}...`,
          iWon
        }
      : null;

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
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-rose to-rose-deep shadow-card" />
          <b className="text-ink">{state.me}</b>
          {myTurn && <span className="text-xs">— te toca</span>}
        </span>
        <span className={cn("flex items-center gap-2", !myTurn && phase === "playing" && "text-slate-500")}>
          {phase === "playing" && !myTurn && <span className="text-xs">pensando...</span>}
          <b className="text-ink">{state.them}</b>
          <span className="h-4 w-4 rounded-full bg-gradient-to-br from-slate-500 to-slate-800 shadow-card" />
        </span>
      </div>

      <div className="mx-auto max-w-[420px] rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-2 shadow-lift">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {state.cells.map((owner, at) => {
            const canPlay = legalSet.has(at);
            const isLast = state.last === at;
            return (
              <button
                key={at}
                disabled={!canPlay}
                onClick={() => tap(at)}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-[4px] bg-emerald-600/50 transition",
                  canPlay && "cursor-pointer ring-1 ring-inset ring-white/25 hover:bg-emerald-500/60"
                )}
                style={{ perspective: "300px" }}
              >
                {owner && (
                  <span
                    className={cn("absolute inset-[12%] rounded-full", isLast && "ring-2 ring-amber-300/90")}
                    style={{
                      transformStyle: "preserve-3d",
                      transition: "transform 0.35s ease",
                      transform: `rotateY(${owner === "them" ? 180 : 0}deg)`
                    }}
                  >
                    <span
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-rose to-rose-deep shadow-sm"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <span className="absolute left-[22%] top-[16%] h-[24%] w-[32%] rounded-full bg-white/40 blur-[1px]" />
                    </span>
                    <span
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-400 to-slate-800 shadow-sm"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <span className="absolute left-[22%] top-[16%] h-[24%] w-[32%] rounded-full bg-white/30 blur-[1px]" />
                    </span>
                  </span>
                )}
                {canPlay && !owner && (
                  <span className="absolute inset-[34%] rounded-full bg-rose/40" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {phase === "playing" && !myTurn && (
        <p className="mt-3 text-center text-xs text-ink-soft">Le toca a {partnerName}…</p>
      )}
    </DuelFrame>
  );
}
