import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { dayKeyIn } from "@/lib/dates";
import { bestOf, gameByKey, gameOfDay, wordsOfDay, scrambleWord } from "@/lib/games";
import { GameHost } from "@/features/play/game-host";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { gameKey: string } }): Metadata {
  const def = gameByKey(params.gameKey);
  return { title: def ? def.name : "Arcade" };
}

export default async function GamePage({ params }: { params: { gameKey: string } }) {
  const def = gameByKey(params.gameKey);
  if (!def) notFound();

  const { user, couple, partner } = await requireCouple();
  const dateKey = dayKeyIn(couple.timezone);

  const scores = await prisma.gameScore.findMany({
    where: { coupleId: couple.id, gameKey: def.key, dateKey }
  });
  const mine = scores.filter((s) => s.userId === user.id).map((s) => s.score);
  const theirs = partner
    ? scores.filter((s) => s.userId === partner.id).map((s) => s.score)
    : [];

  const anagramWords =
    def.key === "anagram"
      ? wordsOfDay(dateKey).map((word, i) => ({
          word,
          scrambled: scrambleWord(word, i + 1)
        }))
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <GameHost
        gameKey={def.key}
        name={def.name}
        rules={def.rules}
        unit={def.unit}
        lowerIsBetter={def.lowerIsBetter}
        attemptsLeft={Math.max(0, def.maxAttemptsPerDay - mine.length)}
        myBest={bestOf(def, mine)}
        partnerBest={bestOf(def, theirs)}
        partnerName={partner?.name ?? "tu pareja"}
        formatHint={def.unit === "s" ? "s" : def.unit === "ms" ? "ms" : "int"}
        isDaily={gameOfDay(dateKey).key === def.key}
        anagramWords={anagramWords}
      />
    </div>
  );
}
