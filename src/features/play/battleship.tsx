"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Anchor, ArrowLeft, Crosshair, Waves, Wifi } from "lucide-react";
import { bsSignalAction } from "@/actions/battleship";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx, vibrate } from "@/lib/sound";
import { GRID, cellKey, placeFleet, totalShipCells } from "@/lib/battleship";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/features/play/confetti";
import { cn } from "@/lib/utils";

// Hundir la flota, 1v1 EN VIVO por turnos (el bus SSE añade latencia, así que
// nada de tiempo real: cada disparo lo resuelve el defensor, que sabe dónde
// están sus barcos, y responde). Colocación aleatoria; en acierto repites, en
// fallo pasa el turno; ganas al hundir toda la flota rival.

type Phase = "lobby" | "inviting" | "incoming" | "playing" | "over";
type Shot = "hit" | "miss" | "sunk";

export function Battleship({ myId, partnerName }: { myId: string; partnerName: string }) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [myTurn, setMyTurn] = useState(false);
  const [enemy, setEnemy] = useState<Record<string, Shot>>({}); // mis disparos al rival
  const [onMe, setOnMe] = useState<Record<string, "hit" | "miss">>({}); // disparos que recibo
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const phaseRef = useRef<Phase>("lobby");
  const turnRef = useRef(false);
  const fleetRef = useRef<string[][]>([]);
  const myHitsRef = useRef<Set<string>>(new Set());
  const enemyRef = useRef<Record<string, Shot>>({});
  const onMeRef = useRef<Record<string, "hit" | "miss">>({});
  const pendingRef = useRef<string | null>(null);
  const iInvitedRef = useRef(false);
  const seedRef = useRef(0);

  function setPhaseAll(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }
  function setTurn(v: boolean) {
    turnRef.current = v;
    setMyTurn(v);
  }

  function startGame(seed: number) {
    fleetRef.current = placeFleet();
    myHitsRef.current = new Set();
    enemyRef.current = {};
    onMeRef.current = {};
    pendingRef.current = null;
    setEnemy({});
    setOnMe({});
    setResult(null);
    setNotice(null);
    // quien empieza lo decide la semilla del que invita (misma cuenta en ambos)
    setTurn(iInvitedRef.current ? seed % 2 === 0 : seed % 2 === 1);
    setPhaseAll("playing");
  }

  function invite() {
    iInvitedRef.current = true;
    seedRef.current = Math.floor(Math.random() * 1_000_000);
    setPhaseAll("inviting");
    setNotice(null);
    void bsSignalAction({ kind: "invite", seed: seedRef.current });
  }
  function accept() {
    void bsSignalAction({ kind: "accept" });
  }
  function cancel() {
    void bsSignalAction({ kind: "quit" });
    setPhaseAll("lobby");
  }

  function fireAt(r: number, c: number) {
    if (phaseRef.current !== "playing" || !turnRef.current || pendingRef.current) return;
    const k = cellKey(r, c);
    if (enemyRef.current[k]) return; // ya disparado ahí
    pendingRef.current = k;
    void bsSignalAction({ kind: "fire", r, c });
  }

  useCoupleStream((event) => {
    if (event.type !== "bs:signal") return;
    const p = event.payload;
    const mine = p.byId === myId;

    if (p.kind === "invite") {
      if (mine) {
        seedRef.current = p.seed ?? 0;
      } else if (phaseRef.current === "lobby" || phaseRef.current === "over") {
        seedRef.current = p.seed ?? 0;
        iInvitedRef.current = false;
        setPhaseAll("incoming");
        setNotice(null);
      }
      return;
    }
    if (p.kind === "accept") {
      if (phaseRef.current === "inviting" || phaseRef.current === "incoming") startGame(seedRef.current);
      return;
    }
    if (p.kind === "quit") {
      if (!mine && phaseRef.current !== "lobby") {
        setPhaseAll("lobby");
        setNotice(`${p.byName} ha dejado la partida`);
      }
      return;
    }

    if (p.kind === "fire" && !mine && phaseRef.current === "playing") {
      // soy el DEFENSOR: resuelvo sobre mi flota y respondo
      const k = cellKey(p.r!, p.c!);
      const ship = fleetRef.current.find((s) => s.includes(k));
      const hit = !!ship;
      onMeRef.current = { ...onMeRef.current, [k]: hit ? "hit" : "miss" };
      setOnMe(onMeRef.current);
      let sunk: string[] | undefined;
      let allSunk = false;
      if (hit) {
        myHitsRef.current.add(k);
        if (ship!.every((cell) => myHitsRef.current.has(cell))) sunk = ship!;
        allSunk = fleetRef.current.every((s) => s.every((cell) => myHitsRef.current.has(cell)));
        vibrate(20);
      }
      void bsSignalAction({ kind: "result", r: p.r, c: p.c, hit, sunk, allSunk });
      if (allSunk) {
        setResult("lose");
        setPhaseAll("over");
      } else {
        setTurn(!hit); // fallo → ahora disparo yo; acierto → sigue el rival
      }
      return;
    }

    if (p.kind === "result" && !mine && phaseRef.current === "playing") {
      // soy el ATACANTE: aplico el resultado de mi disparo
      const k = cellKey(p.r!, p.c!);
      const next = { ...enemyRef.current, [k]: (p.hit ? "hit" : "miss") as Shot };
      if (p.sunk) for (const cell of p.sunk) next[cell] = "sunk";
      enemyRef.current = next;
      setEnemy(next);
      pendingRef.current = null;
      if (p.hit) sfx.pulse();
      if (p.allSunk) {
        setResult("win");
        setPhaseAll("over");
        sfx.success();
      } else {
        setTurn(!!p.hit); // acierto → repites; fallo → pasa el turno
      }
      return;
    }
  });

  // salir de la página en plena partida = abandonar
  useEffect(() => {
    return () => {
      if (phaseRef.current === "playing") void bsSignalAction({ kind: "quit" });
    };
  }, []);

  // ---- lobby / invitación ----
  if (phase === "lobby" || phase === "inviting" || phase === "incoming") {
    return (
      <Shell>
        <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Anchor className="h-8 w-8" />
          </span>
          {phase === "lobby" && (
            <>
              <div>
                <h2 className="font-display text-2xl text-ink">Hundir la flota</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
                  Duelo por turnos en directo con {partnerName}. Encuentra sus barcos
                  antes de que encuentre los tuyos.
                </p>
              </div>
              {notice && <p className="text-sm text-ink-soft">{notice}</p>}
              <Button onClick={invite}>Retar a {partnerName}</Button>
            </>
          )}
          {phase === "inviting" && (
            <>
              <p className="text-sm font-medium text-ink">Esperando a {partnerName}…</p>
              <Button variant="secondary" size="sm" onClick={cancel}>
                Cancelar
              </Button>
            </>
          )}
          {phase === "incoming" && (
            <>
              <p className="font-display text-xl text-ink">{partnerName} te reta a un duelo naval</p>
              <div className="flex gap-2">
                <Button onClick={accept}>A la batalla</Button>
                <Button variant="secondary" onClick={cancel}>
                  Ahora no
                </Button>
              </div>
            </>
          )}
        </div>
      </Shell>
    );
  }

  const won = result === "win";
  const enemyShots = Object.keys(enemy).filter((k) => enemy[k] !== "miss").length;
  const enemyHitsNeeded = totalShipCells();

  return (
    <Shell>
      {phase === "over" && won && <Confetti />}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          {phase === "over" ? (
            <p className="font-display text-lg text-ink">
              {won ? "¡Flota rival hundida! 🎉" : `${partnerName} ha hundido tu flota…`}
            </p>
          ) : (
            <p className={cn("text-sm font-medium", myTurn ? "text-rose-deep" : "text-ink-soft")}>
              {myTurn ? "Tu turno — dispara" : `Turno de ${partnerName}…`}
            </p>
          )}
          {phase === "over" && <Button size="sm" onClick={invite}>Revancha</Button>}
        </div>

        {/* Objetivo: donde disparo */}
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <Crosshair className="h-3.5 w-3.5" /> Objetivo — {enemyShots}/{enemyHitsNeeded} tocados
        </p>
        <Board
          interactive={phase === "playing" && myTurn && !pendingRef.current}
          onFire={fireAt}
          render={(r, c) => {
            const st = enemy[cellKey(r, c)];
            return (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-[3px] text-[10px]",
                  !st && "bg-sky-500/15 hover:bg-sky-500/30",
                  st === "miss" && "bg-sky-500/10",
                  (st === "hit" || st === "sunk") && "bg-red-500/80"
                )}
              >
                {st === "miss" && <span className="h-1 w-1 rounded-full bg-sky-700/50" />}
                {(st === "hit" || st === "sunk") && "💥"}
              </div>
            );
          }}
        />

        {/* Tu flota */}
        <p className="mb-1 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <Waves className="h-3.5 w-3.5" /> Tu flota
        </p>
        <Board
          interactive={false}
          render={(r, c) => {
            const k = cellKey(r, c);
            const isShip = fleetRef.current.some((s) => s.includes(k));
            const shot = onMe[k];
            return (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-[3px] text-[10px]",
                  !isShip && !shot && "bg-sky-500/10",
                  !isShip && shot === "miss" && "bg-sky-500/10",
                  isShip && !shot && "bg-slate-400/70",
                  isShip && shot === "hit" && "bg-red-500/80"
                )}
              >
                {shot === "miss" && <span className="h-1 w-1 rounded-full bg-sky-700/50" />}
                {isShip && shot === "hit" && "🔥"}
              </div>
            );
          }}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
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
      <Card className="overflow-hidden p-0">{children}</Card>
    </div>
  );
}

// Tablero 8x8 reutilizable.
function Board({
  interactive,
  onFire,
  render
}: {
  interactive: boolean;
  onFire?: (r: number, c: number) => void;
  render: (r: number, c: number) => React.ReactNode;
}) {
  return (
    <div className="mx-auto grid aspect-square w-full max-w-[360px] grid-cols-8 gap-0.5 rounded-lg bg-sky-900/20 p-1">
      {Array.from({ length: GRID * GRID }, (_, i) => {
        const r = Math.floor(i / GRID);
        const c = i % GRID;
        return (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => onFire?.(r, c)}
            className={cn("aspect-square", interactive ? "cursor-crosshair" : "cursor-default")}
          >
            {render(r, c)}
          </button>
        );
      })}
    </div>
  );
}
