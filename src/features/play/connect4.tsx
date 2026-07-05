"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Swords, Wifi } from "lucide-react";
import { c4SignalAction } from "@/actions/connect4";
import { useCoupleStream } from "@/hooks/use-stream";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/features/play/confetti";
import { cn } from "@/lib/utils";

// 4 en raya en vivo. El bus SSE serializa los movimientos: cada cliente
// aplica los eventos en el orden en que llegan (incluido el eco de los
// propios), asi que ambos tableros avanzan igual.

const COLS = 7;
const ROWS = 6;

type Phase = "lobby" | "inviting" | "incoming" | "playing" | "over";
type CellOwner = "me" | "them" | null;

function findWin(board: CellOwner[][]): { owner: "me" | "them"; cells: string[] } | null {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const owner = board[c][r];
      if (!owner) continue;
      for (const [dc, dr] of dirs) {
        const cells = [`${c}:${r}`];
        for (let k = 1; k < 4; k++) {
          const nc = c + dc * k;
          const nr = r + dr * k;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
          if (board[nc][nr] !== owner) break;
          cells.push(`${nc}:${nr}`);
        }
        if (cells.length === 4) return { owner, cells };
      }
    }
  }
  return null;
}

export function Connect4({ myId, partnerName }: { myId: string; partnerName: string }) {
  const [phase, setPhase] = useState<Phase>("lobby");
  // board[col][row]: row 0 = abajo
  const [board, setBoard] = useState<CellOwner[][]>(() =>
    Array.from({ length: COLS }, () => Array<CellOwner>(ROWS).fill(null))
  );
  const [myTurn, setMyTurn] = useState(false);
  const [win, setWin] = useState<{ owner: "me" | "them"; cells: string[] } | null>(null);
  const [draw, setDraw] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const phaseRef = useRef<Phase>("lobby");
  const iInvitedRef = useRef(false);
  const seedRef = useRef(0);
  const movesRef = useRef(0);
  const iStartRef = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;

  function setPhaseAll(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function resetBoard() {
    movesRef.current = 0;
    setBoard(Array.from({ length: COLS }, () => Array<CellOwner>(ROWS).fill(null)));
    setWin(null);
    setDraw(false);
  }

  function startGame(seed: number) {
    resetBoard();
    // quien empieza lo decide la semilla del que invita (misma cuenta en ambos)
    iStartRef.current = iInvitedRef.current ? seed % 2 === 0 : seed % 2 === 1;
    setMyTurn(iStartRef.current);
    setPhaseAll("playing");
    setNotice(null);
  }

  function applyMove(byMe: boolean, col: number) {
    const next = boardRef.current.map((column) => [...column]);
    const row = next[col].indexOf(null);
    if (row === -1) return; // columna llena: se ignora
    next[col][row] = byMe ? "me" : "them";
    movesRef.current += 1;
    setBoard(next);

    const result = findWin(next);
    if (result) {
      setWin(result);
      setPhaseAll("over");
      return;
    }
    if (movesRef.current >= COLS * ROWS) {
      setDraw(true);
      setPhaseAll("over");
      return;
    }
    // turno: alterna desde quien empezo
    const myMovesNext = movesRef.current % 2 === 0 ? iStartRef.current : !iStartRef.current;
    setMyTurn(myMovesNext);
  }

  useCoupleStream((event) => {
    if (event.type !== "c4:signal") return;
    const { kind, byId, byName, seed, col } = event.payload;
    const mine = byId === myId;

    if (kind === "invite" && !mine) {
      seedRef.current = seed ?? 0;
      iInvitedRef.current = false;
      if (phaseRef.current === "lobby" || phaseRef.current === "over") {
        setPhaseAll("incoming");
        setNotice(null);
      }
    }
    if (kind === "invite" && mine) {
      // eco de mi propia invitacion: quedo a la espera
      seedRef.current = seed ?? 0;
    }
    if (kind === "accept") {
      if (phaseRef.current === "inviting" || phaseRef.current === "incoming") {
        startGame(seedRef.current);
      }
    }
    if (kind === "move" && col !== undefined && phaseRef.current === "playing") {
      applyMove(mine, col);
    }
    if (kind === "quit" && !mine && (phaseRef.current === "playing" || phaseRef.current === "inviting")) {
      setPhaseAll("lobby");
      resetBoard();
      setNotice(`${byName} ha salido de la partida`);
    }
  });

  // salir de la pagina en mitad de partida = abandonar
  useEffect(() => {
    return () => {
      if (phaseRef.current === "playing") void c4SignalAction({ kind: "quit" });
    };
  }, []);

  function invite() {
    iInvitedRef.current = true;
    seedRef.current = Math.floor(Math.random() * 1_000_000);
    setPhaseAll("inviting");
    setNotice(null);
    void c4SignalAction({ kind: "invite", seed: seedRef.current });
  }

  function accept() {
    void c4SignalAction({ kind: "accept" });
    // la partida arranca cuando llegue el eco del accept (mismo orden en ambos)
  }

  function cancel() {
    void c4SignalAction({ kind: "quit" });
    setPhaseAll("lobby");
    resetBoard();
  }

  function drop(col: number) {
    if (phaseRef.current !== "playing" || !myTurn) return;
    if (boardRef.current[col].indexOf(null) === -1) return;
    setMyTurn(false); // optimista: evita doble click; el eco confirma
    void c4SignalAction({ kind: "move", col });
  }

  const iWon = win?.owner === "me";

  return (
    <div className="relative">
      {phase === "over" && iWon && <Confetti />}

      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Arcade
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Wifi className="h-3 w-3" /> En vivo
        </span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-700 px-5 py-4 text-white">
          <Swords className="absolute -right-3 -top-3 h-20 w-20 opacity-15" />
          <h1 className="font-display text-2xl">4 en raya</h1>
          <p className="mt-1 max-w-md text-sm text-white/85">
            Cabeza a cabeza y en directo: {partnerName} tiene que estar con Near abierto.
          </p>
        </div>

        <div className="p-5">
          {phase === "lobby" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
                <Swords className="h-10 w-10" />
              </span>
              {notice && <p className="text-sm text-ink-soft">{notice}</p>}
              <Button size="lg" onClick={invite}>
                Retar a {partnerName}
              </Button>
              <p className="max-w-xs text-xs text-ink-soft">
                Le llegara el reto al instante si esta dentro de la app.
              </p>
            </div>
          )}

          {phase === "inviting" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
                <Swords className="h-8 w-8" />
              </span>
              <p className="text-sm font-medium text-ink">Esperando a {partnerName}...</p>
              <Button variant="secondary" size="sm" onClick={cancel}>
                Cancelar
              </Button>
            </div>
          )}

          {phase === "incoming" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-16 w-16 animate-pulse-heart items-center justify-center rounded-3xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400">
                <Swords className="h-8 w-8" />
              </span>
              <p className="font-display text-xl text-ink">{partnerName} te reta al 4 en raya</p>
              <div className="flex gap-2">
                <Button onClick={accept}>Jugar</Button>
                <Button variant="secondary" onClick={cancel}>
                  Ahora no
                </Button>
              </div>
            </div>
          )}

          {(phase === "playing" || phase === "over") && (
            <div>
              <div className="mb-3 flex items-center justify-between text-sm font-medium">
                <span className={cn("flex items-center gap-2", myTurn && phase === "playing" && "text-rose-deep")}>
                  <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-rose to-rose-deep shadow-card" />
                  Tu
                  {phase === "playing" && myTurn && <span className="text-xs">— te toca</span>}
                </span>
                <span className={cn("flex items-center gap-2", !myTurn && phase === "playing" && "text-amber-600")}>
                  {phase === "playing" && !myTurn && <span className="text-xs">pensando...</span>}
                  {partnerName}
                  <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-card" />
                </span>
              </div>

              <div
                className="rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-800 p-2.5 shadow-lift"
                onPointerLeave={() => setHoverCol(null)}
              >
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: COLS }, (_, c) => (
                    <button
                      key={c}
                      disabled={phase !== "playing" || !myTurn}
                      onClick={() => drop(c)}
                      onPointerEnter={() => setHoverCol(c)}
                      className="group flex flex-col-reverse gap-1.5 rounded-lg py-0.5 transition disabled:cursor-default"
                    >
                      {Array.from({ length: ROWS }, (_, r) => {
                        const owner = board[c][r];
                        const isWinCell = win?.cells.includes(`${c}:${r}`);
                        const isDropTarget =
                          phase === "playing" &&
                          myTurn &&
                          hoverCol === c &&
                          board[c].indexOf(null) === r;
                        return (
                          <span
                            key={r}
                            className={cn(
                              "relative block aspect-square w-full rounded-full transition",
                              "bg-indigo-950/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                            )}
                          >
                            {owner && (
                              <span
                                className={cn(
                                  "c4-disc absolute inset-[8%] rounded-full",
                                  owner === "me"
                                    ? "bg-gradient-to-br from-rose to-rose-deep"
                                    : "bg-gradient-to-br from-amber-300 to-amber-500",
                                  isWinCell && "animate-pulse ring-4 ring-white/80"
                                )}
                                style={{ ["--drop-from" as string]: `${-(ROWS - r) * 46}px` }}
                              >
                                <span className="absolute left-[18%] top-[12%] h-[25%] w-[35%] rounded-full bg-white/40 blur-[1px]" />
                              </span>
                            )}
                            {isDropTarget && !owner && (
                              <span className="absolute inset-[8%] rounded-full bg-rose/40" />
                            )}
                          </span>
                        );
                      })}
                    </button>
                  ))}
                </div>
              </div>

              {phase === "over" && (
                <div className="mt-4 flex flex-col items-center gap-3 text-center">
                  <p className="font-display text-2xl text-ink">
                    {draw ? "Empate. Tablas dignas." : iWon ? "Has ganado!!" : `Gana ${partnerName}...`}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={invite}>Revancha</Button>
                    <Link
                      href="/play"
                      className="flex items-center rounded-full border border-sand-deep px-4 text-sm font-medium text-ink transition hover:bg-sand"
                    >
                      Volver
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
