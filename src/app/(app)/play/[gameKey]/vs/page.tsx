import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCouple } from "@/lib/couple";
import { dayKeyIn } from "@/lib/dates";
import { gameByKey, scrambleWord, wordsOfDay } from "@/lib/games";
import { raceEnabled } from "@/lib/race";
import { RaceRoom } from "@/features/play/race/race-room";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { gameKey: string } }): Metadata {
  const def = gameByKey(params.gameKey);
  return { title: def ? `Duelo · ${def.name}` : "Duelo en vivo" };
}

export default async function RacePage({ params }: { params: { gameKey: string } }) {
  const def = gameByKey(params.gameKey);
  if (!def || !raceEnabled(def.key)) notFound();

  const { user, couple, partner } = await requireCouple();

  // Palabra oculta: las mismas palabras del día para los dos (duelo justo).
  const anagramWords =
    def.key === "anagram"
      ? wordsOfDay(dayKeyIn(couple.timezone)).map((word, i) => ({ word, scrambled: scrambleWord(word, i + 1) }))
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <RaceRoom
        gameKey={def.key}
        myId={user.id}
        myName={user.name}
        partnerName={partner?.name ?? "tu pareja"}
        anagramWords={anagramWords}
      />
    </div>
  );
}
