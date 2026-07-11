"use client";

import { ReactionGame } from "@/features/play/games/reaction";
import { MemoryGame } from "@/features/play/games/memory";
import { TargetsGame } from "@/features/play/games/targets";
import { EchoGame } from "@/features/play/games/echo";
import { AnagramGame } from "@/features/play/games/anagram";
import { SprintGame } from "@/features/play/games/sprint";
import { TypingGame } from "@/features/play/games/typing";
import { GolfGame } from "@/features/play/games/golf";
import { CapsGame } from "@/features/play/games/caps";
import { MeteorGame } from "@/features/play/games/meteor";
import { SkiGame } from "@/features/play/games/ski";
import { BricksGame } from "@/features/play/games/bricks";
import { ClimbGame } from "@/features/play/games/climb";
import { PinballGame } from "@/features/play/games/pinball";

// Punto único donde una clave de juego se convierte en su componente. Lo usan
// tanto la arcade en solitario (game-host) como el modo "Duelo en vivo" (sala
// de carrera). `onProgress` solo lo consumen los juegos ya cableados; el resto
// lo ignoran sin problema (es opcional).
export function ArcadeGameView({
  gameKey,
  onFinish,
  onProgress,
  anagramWords
}: {
  gameKey: string;
  onFinish: (score: number) => void;
  onProgress?: (score: number) => void;
  anagramWords?: { word: string; scrambled: string }[];
}) {
  return (
    <>
      {gameKey === "reaction" && <ReactionGame onFinish={onFinish} />}
      {gameKey === "memory" && <MemoryGame onFinish={onFinish} />}
      {gameKey === "targets" && <TargetsGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "echo" && <EchoGame onFinish={onFinish} />}
      {gameKey === "anagram" && <AnagramGame onFinish={onFinish} words={anagramWords ?? []} />}
      {gameKey === "sprint" && <SprintGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "typing" && <TypingGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "golf" && <GolfGame onFinish={onFinish} />}
      {gameKey === "caps" && <CapsGame onFinish={onFinish} />}
      {gameKey === "meteor" && <MeteorGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "ski" && <SkiGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "bricks" && <BricksGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "climb" && <ClimbGame onFinish={onFinish} onProgress={onProgress} />}
      {gameKey === "pinball" && <PinballGame onFinish={onFinish} onProgress={onProgress} />}
    </>
  );
}
