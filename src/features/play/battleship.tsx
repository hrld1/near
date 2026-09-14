"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Anchor, ArrowLeft, Check, Crosshair, RotateCw, Shuffle, Undo2, Waves, Wifi } from "lucide-react";
import { bsSignalAction } from "@/actions/battleship";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx, vibrate } from "@/lib/sound";
import { GRID, SHIP_SIZES, cellKey, placeFleet, totalShipCells, tryPlace } from "@/lib/battleship";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/features/play/confetti";
import { cn } from "@/lib/utils";

// Hundir la flota, 1v1 EN VIVO por turnos (el bus SSE añade latencia, así que
// nada de tiempo real: cada disparo lo resuelve el defensor, que sabe dónde
// están sus barcos, y responde). Colocación MANUAL de la flota (it53): cada uno
// coloca sus barcos antes de empezar y solo se juega cuando ambos están listos.
// En acierto repites, en fallo pasa el turno; ganas al hundir toda la flota.

type Phase = "lobby" | "inviting" | "incoming" | "placing" | "playing" | "over";
type Shot = "hit" | "miss" | "sunk";
type Flash = { text: string; tone: "hit" | "miss" | "sunk" };

export function Battleship({ myId, partnerName }: { myId: string; partnerName: string }) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [myTurn, setMyTurn] = useState(false);
  const [enemy, setEnemy] = useState<Record<string, Shot>>({}); // mis disparos al rival
  const [onMe, setOnMe] = useState<Record<string, "hit" | "miss">>({}); // disparos que recibo
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // colocación manual
  const [placed, setPlaced] = useState<string[][]>([]);
  const [horiz, setHoriz] = useState(true);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  // aviso volador de "¡Tocado!/¡Hundido!/¡Agua!"
  const [flash, setFlash] = useState<Flash | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseRef = useRef<Phase>("lobby");
  const turnRef = useRef(false);
  const fleetRef = useRef<string[][]>([]);
  const myHitsRef = useRef<Set<string>>(new Set());
  const enemyRef = useRef<Record<string, Shot>>({});
  const onMeRef = useRef<Record<string, "hit" | "miss">>({});
  const pendingRef = useRef<string | null>(null);
  const iInvitedRef = useRef(false);
  const seedRef = useRef(0);
  const iReadyRef = useRef(false);
  const partnerReadyRef = useRef(false);

  function setPhaseAll(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }
  function setTurn(v: boolean) {
    turnRef.current = v;
    setMyTurn(v);
  }
  function showFlash(text: string, tone: Flash["tone"]) {
    setFlash({ text, tone });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  }

  // Tras aceptar: cada uno coloca su flota. Solo se juega cuando ambos avisan.
  function beginPlacement(seed: number) {
    seedRef.current = seed;
    fleetRef.current = [];
    myHitsRef.current = new Set();
    enemyRef.current = {};
    onMeRef.current = {};
    pendingRef.current = null;
    iReadyRef.current = false;
    partnerReadyRef.current = false;
    setEnemy({});
    setOnMe({});
    setResult(null);
    setNotice(null);
    setPlaced([]);
    setHoriz(true);
    setHover(null);
    setFlash(null);
    setPhaseAll("placing");
  }

  function startPlay() {
    setNotice(null);
    // quien empieza lo decide la semilla del que invita (misma cuenta en ambos)
    setTurn(iInvitedRef.current ? seedRef.current % 2 === 0 : seedRef.current % 2 === 1);
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

  // ---- colocación ----
  function placeAt(r: number, c: number) {
    const size = SHIP_SIZES[placed.length];
    if (size === undefined) return;
    const cells = tryPlace(new Set(placed.flat()), r, c, size, horiz);
    if (!cells) {
      showFlash("Ahí no cabe", "miss");
      return;
    }
    setPlaced((prev) => [...prev, cells]);
  }
  function undoShip() {
    setPlaced((prev) => prev.slice(0, -1));
  }
  function randomFleet() {
    setPlaced(placeFleet());
  }
  function ready() {
    if (placed.length !== SHIP_SIZES.length) return;
    fleetRef.current = placed;
    iReadyRef.current = true;
    void bsSignalAction({ kind: "ready" });
    if (partnerReadyRef.current) startPlay();
    else setNotice(`Esperando a que ${partnerName} coloque su flota…`);
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
      if (phaseRef.current === "inviting" || phaseRef.current === "incoming") beginPlacement(seedRef.current);
      return;
    }
    if (p.kind === "ready") {
      if (!mine) {
        partnerReadyRef.current = true;
        if (iReadyRef.current) startPlay();
        else if (phaseRef.current === "placing") setNotice(`${p.byName} ya tiene su flota lista. Coloca la tuya.`);
      }
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
        showFlash("Tu flota se ha hundido…", "sunk");
        setResult("lose");
        setPhaseAll("over");
      } else {
        if (sunk) showFlash("Te han hundido un barco", "sunk");
        else if (hit) showFlash("¡Te han dado!", "hit");
        else showFlash("¡Han fallado!", "miss");
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
        showFlash("¡Flota rival hundida! ¡Ganaste!", "sunk");
        setResult("win");
        setPhaseAll("over");
        sfx.success();
      } else {
        if (p.sunk) showFlash("¡Hundido!", "sunk");
        else if (p.hit) showFlash("¡Tocado!", "hit");
        else showFlash("¡Agua!", "miss");
        setTurn(!!p.hit); // acierto → repites; fallo → pasa el turno
      }
      return;
    }
  });

  // salir de la página con la partida en marcha = abandonar
  useEffect(() => {
    return () => {
      if (phaseRef.current === "playing" || phaseRef.current === "placing") {
        void bsSignalAction({ kind: "quit" });
      }
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // ---- lobby / invitación ----
  if (phase === "lobby" || phase === "inviting" || phase === "incoming") {
    return (
      <Shell>
        <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose/12 text-rose-deep">
            <Anchor className="h-8 w-8" />
          </span>
          {phase === "lobby" && (
            <>
              <div>
                <h2 className="font-display text-2xl text-ink">Hundir la flota</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
                  Duelo por turnos en directo con {partnerName}. Coloca tu flota y encuentra la suya
                  antes de que encuentre la tuya.
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

  // ---- colocación de la flota ----
  if (phase === "placing") {
    const occupied = new Set(placed.flat());
    const nextSize = SHIP_SIZES[placed.length];
    const done = placed.length === SHIP_SIZES.length;
    const preview =
      hover && nextSize !== undefined ? tryPlace(occupied, hover.r, hover.c, nextSize, horiz) : null;
    const previewSet = new Set(preview ?? []);
    const previewBad = !!hover && nextSize !== undefined && !preview;

    return (
      <Shell>
        <div className="p-4">
          <div className="mb-3">
            <p className="font-display text-lg text-ink">Coloca tu flota</p>
            <p className="text-xs text-ink-soft">
              {done
                ? "Flota lista. Pulsa “Listo” cuando quieras empezar."
                : `Te quedan ${SHIP_SIZES.length - placed.length} barcos. Toca el tablero para colocar uno de ${nextSize} casillas.`}
            </p>
          </div>

          <Board
            interactive={!done}
            onFire={placeAt}
            onHover={(r, c) => setHover({ r, c })}
            onLeaveBoard={() => setHover(null)}
            render={(r, c) => {
              const k = cellKey(r, c);
              const isShip = occupied.has(k);
              const isPreview = previewSet.has(k);
              return (
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-[3px] bg-gradient-to-br transition-colors",
                    !isShip && !isPreview && "from-sky-400/10 to-sky-500/10",
                    isShip && "from-slate-300 to-slate-500 shadow-inner",
                    isPreview && !previewBad && "from-emerald-300 to-emerald-500",
                    isPreview && previewBad && "from-red-300 to-red-500"
                  )}
                />
              );
            }}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setHoriz((h) => !h)} disabled={done}>
              <RotateCw className="h-4 w-4" /> {horiz ? "Horizontal" : "Vertical"}
            </Button>
            <Button size="sm" variant="secondary" onClick={randomFleet}>
              <Shuffle className="h-4 w-4" /> Aleatorio
            </Button>
            <Button size="sm" variant="secondary" onClick={undoShip} disabled={placed.length === 0}>
              <Undo2 className="h-4 w-4" /> Deshacer
            </Button>
            <Button size="sm" onClick={ready} disabled={!done}>
              <Check className="h-4 w-4" /> Listo
            </Button>
          </div>
          {notice && <p className="mt-3 text-center text-sm text-ink-soft">{notice}</p>}
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
      <div className="relative p-4">
        {flash && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center">
            <span
              className={cn(
                "animate-pop-in rounded-full px-5 py-2 font-display text-lg font-semibold text-white shadow-lift",
                flash.tone === "hit" && "bg-orange-500",
                flash.tone === "sunk" && "bg-red-600",
                flash.tone === "miss" && "bg-sky-600"
              )}
            >
              {flash.text}
            </span>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          {phase === "over" ? (
            <p className="font-display text-lg text-ink">
              {won ? "¡Flota rival hundida!" : `${partnerName} ha hundido tu flota…`}
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
                  "flex h-full w-full items-center justify-center rounded-[3px] text-2xs transition-colors",
                  !st && "bg-sky-400/15 hover:bg-sky-400/35",
                  st === "miss" && "bg-sky-400/10",
                  st === "hit" && "bg-red-500/80",
                  st === "sunk" && "bg-red-900/80"
                )}
              >
                {st === "miss" && <span className="h-1.5 w-1.5 rounded-full bg-sky-700/50" />}
                {st === "hit" && <span className="animate-pop-in">💥</span>}
                {st === "sunk" && <span className="text-white/90">✖</span>}
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
                  "flex h-full w-full items-center justify-center rounded-[3px] bg-gradient-to-br text-2xs",
                  !isShip && "from-sky-400/10 to-sky-500/10",
                  isShip && !shot && "from-slate-300 to-slate-500 shadow-inner",
                  isShip && shot === "hit" && "from-red-500 to-red-700"
                )}
              >
                {shot === "miss" && <span className="h-1.5 w-1.5 rounded-full bg-sky-700/50" />}
                {isShip && shot === "hit" && <span className="animate-pop-in">🔥</span>}
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
  onHover,
  onLeaveBoard,
  render
}: {
  interactive: boolean;
  onFire?: (r: number, c: number) => void;
  onHover?: (r: number, c: number) => void;
  onLeaveBoard?: () => void;
  render: (r: number, c: number) => React.ReactNode;
}) {
  return (
    <div
      onMouseLeave={onLeaveBoard}
      className="mx-auto grid aspect-square w-full max-w-[360px] grid-cols-8 gap-0.5 rounded-lg bg-gradient-to-br from-sky-800/40 to-blue-950/50 p-1 shadow-inner"
    >
      {Array.from({ length: GRID * GRID }, (_, i) => {
        const r = Math.floor(i / GRID);
        const c = i % GRID;
        return (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => onFire?.(r, c)}
            onMouseEnter={() => onHover?.(r, c)}
            className={cn("aspect-square", interactive ? "cursor-crosshair" : "cursor-default")}
          >
            {render(r, c)}
          </button>
        );
      })}
    </div>
  );
}
