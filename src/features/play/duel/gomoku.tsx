"use client";

import { Confetti } from "@/features/play/confetti";
import { duelByKey } from "@/lib/duels";
import { GOMOKU_N, winningCells } from "@/lib/gomoku";
import { sfx, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { DuelFrame } from "./duel-frame";
import { useDuel, type DuelBaseState, type DuelSpec } from "./use-duel";

// 5 en raya (Gomoku) sobre el arnés de duelos. Toda la fontanería del 1v1
// (lobby, turnos, relay, revancha) la pone useDuel; aquí solo el estado del
// tablero, el reducer puro y el render.

type Owner = "me" | "them" | null;
type GState = DuelBaseState & { cells: Owner[]; last: number | null; winCells: number[] };

const N = GOMOKU_N;

const spec: DuelSpec<GState, { at: number }> = {
  key: "gomoku",
  createState: (iStart) => ({
    next: iStart ? "me" : "them",
    winner: null,
    cells: Array<Owner>(N * N).fill(null),
    last: null,
    winCells: []
  }),
  legal: (s, { at }) => s.cells[at] === null,
  applyMove: (s, { at }, byMe) => {
    const side: Owner = byMe ? "me" : "them";
    if (s.winner || s.next !== side || s.cells[at] !== null) return s;
    const cells = s.cells.slice();
    cells[at] = side;
    const run = winningCells(cells, at, side);
    const full = cells.every((c) => c !== null);
    return {
      next: side === "me" ? "them" : "me",
      winner: run ? side : full ? "draw" : null,
      cells,
      last: at,
      winCells: run ?? []
    };
  },
  encode: ({ at }) => [at],
  decode: ([at]) => ({ at })
};

export function Gomoku({ myId, partnerName }: { myId: string; partnerName: string }) {
  const meta = duelByKey("gomoku")!;
  const { phase, state, myTurn, notice, invite, accept, cancel, play } = useDuel(spec, myId);

  function tap(at: number) {
    if (!play({ at })) return;
    sfx.pad(0);
    vibrate(10);
  }

  const iWon = state.winner === "me";
  const result =
    phase === "over"
      ? {
          text: state.winner === "draw" ? "Empate. Tablero lleno." : iWon ? "¡Cinco en raya! Ganas." : `Gana ${partnerName}...`,
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
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-rose to-rose-deep shadow-card" />
          Tu{myTurn && <span className="text-xs">— te toca</span>}
        </span>
        <span className={cn("flex items-center gap-2", !myTurn && phase === "playing" && "text-slate-500")}>
          {phase === "playing" && !myTurn && <span className="text-xs">pensando...</span>}
          {partnerName}
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-slate-500 to-slate-800 shadow-card" />
        </span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/70 p-2 shadow-lift dark:from-amber-950/40 dark:to-amber-900/30">
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {state.cells.map((owner, at) => {
            const isWin = state.winCells.includes(at);
            const isLast = state.last === at;
            return (
              <button
                key={at}
                disabled={!myTurn || owner !== null}
                onClick={() => tap(at)}
                className="group relative flex aspect-square items-center justify-center rounded-[3px] bg-amber-300/30 transition enabled:hover:bg-amber-300/60 disabled:cursor-default dark:bg-amber-100/5"
              >
                {owner && (
                  <span
                    className={cn(
                      "absolute inset-[12%] rounded-full shadow-sm",
                      owner === "me"
                        ? "bg-gradient-to-br from-rose to-rose-deep"
                        : "bg-gradient-to-br from-slate-500 to-slate-800",
                      isWin && "ring-2 ring-white/90 animate-pulse",
                      isLast && !isWin && "ring-2 ring-white/70"
                    )}
                  >
                    <span className="absolute left-[22%] top-[16%] h-[26%] w-[34%] rounded-full bg-white/40 blur-[1px]" />
                  </span>
                )}
                {!owner && myTurn && (
                  <span className="absolute inset-[26%] rounded-full bg-rose/0 transition group-hover:bg-rose/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DuelFrame>
  );
}
