"use client";

import { useEffect, useRef, useState } from "react";
import { duelSignalAction } from "@/actions/duel";
import { sendQuitBeacon } from "@/lib/quit-beacon";
import { useCoupleStream } from "@/hooks/use-stream";

// Arnés reutilizable de los duelos 1v1 EN VIVO. Encapsula TODO el ciclo de
// vida que el 4 en raya y Hundir la flota repetían a mano: lobby, invitar,
// aceptar, turnos, revancha y abandono, más la retransmisión por el bus SSE.
//
// Cada juego solo aporta un `DuelSpec`: cómo es el estado inicial, cómo aplica
// una jugada (reducer PURO, idéntico en ambos clientes) y cómo (de)serializa
// la jugada a un array de enteros. El estado lleva siempre `next` (de quién es
// el turno) y `winner`, y el arnés se apoya en ellos para el turno y el fin.

export type DuelBaseState = {
  next: "me" | "them";
  winner: "me" | "them" | "draw" | null;
};

export type DuelSpec<S extends DuelBaseState, M> = {
  key: string;
  // iStart = ¿muevo yo primero?
  createState: (iStart: boolean) => S;
  // aplica la jugada del bando `byMe`; devuelve el nuevo estado (o el mismo si
  // la jugada es ilegal). DEBE actualizar `next` y, si procede, `winner`.
  applyMove: (state: S, move: M, byMe: boolean) => S;
  // ¿es legal esta jugada para MÍ ahora? (evita retransmitir jugadas nulas)
  legal?: (state: S, move: M) => boolean;
  encode: (move: M) => number[];
  decode: (raw: number[]) => M;
};

export type DuelPhase = "lobby" | "inviting" | "incoming" | "playing" | "over";

export function useDuel<S extends DuelBaseState, M>(spec: DuelSpec<S, M>, myId: string) {
  const [phase, setPhase] = useState<DuelPhase>("lobby");
  const [state, setState] = useState<S>(() => spec.createState(true));
  const [notice, setNotice] = useState<string | null>(null);

  const phaseRef = useRef<DuelPhase>("lobby");
  const iInvitedRef = useRef(false);
  const seedRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lockedRef = useRef(false); // evita doble jugada antes del eco
  const specRef = useRef(spec);
  specRef.current = spec;

  function setPhaseAll(next: DuelPhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function commitState(s: S) {
    stateRef.current = s;
    setState(s);
  }

  function begin(seed: number) {
    // quién empieza lo fija la semilla del que invita (misma cuenta en ambos)
    const iStart = iInvitedRef.current ? seed % 2 === 0 : seed % 2 === 1;
    commitState(specRef.current.createState(iStart));
    lockedRef.current = false;
    setNotice(null);
    setPhaseAll("playing");
  }

  useCoupleStream((event) => {
    if (event.type !== "duel:signal" || event.payload.game !== specRef.current.key) return;
    const { kind, byId, byName, seed, move } = event.payload;
    const mine = byId === myId;

    if (kind === "invite") {
      seedRef.current = seed ?? 0;
      if (!mine) {
        iInvitedRef.current = false;
        if (phaseRef.current === "lobby" || phaseRef.current === "over") {
          setNotice(null);
          setPhaseAll("incoming");
        }
      }
      return;
    }
    if (kind === "accept") {
      if (phaseRef.current === "inviting" || phaseRef.current === "incoming") begin(seedRef.current);
      return;
    }
    if (kind === "move" && move && phaseRef.current === "playing") {
      const next = specRef.current.applyMove(stateRef.current, specRef.current.decode(move), mine);
      commitState(next);
      lockedRef.current = false;
      if (next.winner) setPhaseAll("over");
      return;
    }
    if (kind === "quit" && !mine && (phaseRef.current === "playing" || phaseRef.current === "inviting")) {
      commitState(specRef.current.createState(true));
      setNotice(`${byName} ha salido de la partida`);
      setPhaseAll("lobby");
    }
  });

  // salir de la página en mitad de partida = abandonar. Por beacon y no por
  // server action: al desmontarse ya se está navegando, y el navegador cancela
  // las peticiones normales en vuelo (ver src/lib/quit-beacon.ts).
  useEffect(() => {
    return () => {
      if (phaseRef.current === "playing") sendQuitBeacon("duel", specRef.current.key);
    };
  }, []);

  function invite() {
    iInvitedRef.current = true;
    seedRef.current = Math.floor(Math.random() * 1_000_000);
    setNotice(null);
    setPhaseAll("inviting");
    void duelSignalAction({ game: spec.key, kind: "invite", seed: seedRef.current });
  }

  function accept() {
    void duelSignalAction({ game: spec.key, kind: "accept" });
    // arranca al llegar el eco del accept (mismo orden en ambos clientes)
  }

  function cancel() {
    void duelSignalAction({ game: spec.key, kind: "quit" });
    commitState(spec.createState(true));
    setPhaseAll("lobby");
  }

  // Intenta jugar M. Devuelve true si se retransmitió.
  function play(move: M): boolean {
    const s = stateRef.current;
    if (phaseRef.current !== "playing" || s.next !== "me" || s.winner || lockedRef.current) return false;
    if (spec.legal && !spec.legal(s, move)) return false;
    lockedRef.current = true;
    void duelSignalAction({ game: spec.key, kind: "move", move: spec.encode(move) });
    return true;
  }

  const myTurn = phase === "playing" && state.next === "me" && !state.winner;
  return { phase, state, myTurn, notice, invite, accept, cancel, play };
}
