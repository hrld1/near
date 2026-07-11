"use client";

import { useEffect, useRef, useState } from "react";
import { raceSignalAction } from "@/actions/race";
import { useCoupleStream } from "@/hooks/use-stream";
import type { GameDef } from "@/lib/games";

// Arnés del "Duelo en vivo" de un juego de puntuación. Reutiliza el patrón de
// lobby de los duelos de tablero (invitar/aceptar/abandono/revancha) pero, en
// vez de un reducer por turnos, ambos juegan la MISMA prueba a la vez: se
// retransmite el marcador (limitado) para la barra "vs" y, al terminar los dos,
// se compara con la dirección del juego. Nada se persiste.

export type RacePhase = "lobby" | "inviting" | "incoming" | "countdown" | "playing" | "over";

export function useRace(def: GameDef, myId: string) {
  const game = def.key;
  const [phase, setPhase] = useState<RacePhase>("lobby");
  const [count, setCount] = useState(3);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myFinal, setMyFinal] = useState<number | null>(null);
  const [oppFinal, setOppFinal] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [round, setRound] = useState(0); // key para remontar el juego en cada duelo

  const phaseRef = useRef<RacePhase>("lobby");
  const myFinalRef = useRef<number | null>(null);
  const oppFinalRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  function setPhaseAll(p: RacePhase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function resetRound() {
    setMyScore(0);
    setOppScore(0);
    setMyFinal(null);
    setOppFinal(null);
    myFinalRef.current = null;
    oppFinalRef.current = null;
  }

  function checkOver() {
    if (myFinalRef.current !== null && oppFinalRef.current !== null && phaseRef.current !== "over") {
      setPhaseAll("over");
    }
  }

  function startCountdown() {
    resetRound();
    setRound((r) => r + 1);
    setCount(3);
    setPhaseAll("countdown");
  }

  // cuenta atrás 3·2·1 → a jugar
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      setPhaseAll("playing");
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, count]);

  useCoupleStream((event) => {
    if (event.type !== "race:signal" || event.payload.game !== game) return;
    const { kind, byId, byName, score } = event.payload;
    const mine = byId === myId;

    if (kind === "invite") {
      if (!mine && (phaseRef.current === "lobby" || phaseRef.current === "over")) {
        setNotice(null);
        setPhaseAll("incoming");
      }
      return;
    }
    if (kind === "accept" || kind === "rematch") {
      if (phaseRef.current === "inviting" || phaseRef.current === "incoming" || phaseRef.current === "over") {
        startCountdown();
      }
      return;
    }
    if (kind === "score" && !mine && phaseRef.current === "playing") {
      setOppScore(score ?? 0);
      return;
    }
    if (kind === "done" && !mine) {
      oppFinalRef.current = score ?? 0;
      setOppFinal(score ?? 0);
      setOppScore(score ?? 0);
      checkOver();
      return;
    }
    if (kind === "quit" && !mine && phaseRef.current !== "lobby") {
      resetRound();
      setNotice(`${byName} ha salido del duelo`);
      setPhaseAll("lobby");
    }
  });

  // salir a mitad = abandonar
  useEffect(() => {
    return () => {
      const p = phaseRef.current;
      if (p === "playing" || p === "countdown" || p === "inviting") void raceSignalAction({ game, kind: "quit" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function invite() {
    setNotice(null);
    setPhaseAll("inviting");
    void raceSignalAction({ game, kind: "invite" });
  }
  function accept() {
    void raceSignalAction({ game, kind: "accept" });
  }
  function cancel() {
    void raceSignalAction({ game, kind: "quit" });
    resetRound();
    setPhaseAll("lobby");
  }
  function reportProgress(score: number) {
    setMyScore(score);
    const now = Date.now();
    if (now - lastSentRef.current > 200) {
      lastSentRef.current = now;
      void raceSignalAction({ game, kind: "score", score });
    }
  }
  function reportFinish(score: number) {
    setMyScore(score);
    myFinalRef.current = score;
    setMyFinal(score);
    void raceSignalAction({ game, kind: "done", score });
    checkOver();
  }

  return {
    phase,
    count,
    round,
    myScore,
    oppScore,
    myFinal,
    oppFinal,
    notice,
    invite,
    accept,
    cancel,
    reportProgress,
    reportFinish
  };
}
