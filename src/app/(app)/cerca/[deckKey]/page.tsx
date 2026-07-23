import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { deckByKey, makeCardId } from "@/lib/decks";
import { DeckView } from "@/features/cerca/deck-view";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { deckKey: string } }): Metadata {
  const deck = deckByKey(params.deckKey);
  return { title: deck ? deck.name : "Mazo" };
}

export default async function DeckPage({ params }: { params: { deckKey: string } }) {
  const deck = deckByKey(params.deckKey);
  if (!deck) notFound();

  const { user, partner } = await requireCouple();
  const cardIds = deck.cards.map((_, i) => makeCardId(deck.key, i));
  const userIds = partner ? [user.id, partner.id] : [user.id];
  const answers = await prisma.cardAnswer.findMany({
    where: { cardId: { in: cardIds }, userId: { in: userIds } },
    select: { cardId: true, userId: true, answer: true }
  });
  const byKey = new Map<string, string>();
  for (const a of answers) byKey.set(`${a.cardId}|${a.userId}`, a.answer);

  const initial = deck.cards.map((text, i) => {
    const cardId = makeCardId(deck.key, i);
    const myAnswer = byKey.get(`${cardId}|${user.id}`) ?? null;
    const partnerRaw = partner ? byKey.get(`${cardId}|${partner.id}`) ?? null : null;
    return {
      cardId,
      text,
      myAnswer,
      partnerAnswered: partnerRaw !== null,
      // reciprocidad: solo revelo la suya si YO he respondido
      partnerAnswer: myAnswer ? partnerRaw : null
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <DeckView
        deck={{ deckKey: deck.key, name: deck.name, accent: deck.accent, tagline: deck.tagline, intimate: deck.intimate }}
        partnerName={partner?.name ?? "tu pareja"}
        initial={initial}
      />
    </div>
  );
}
