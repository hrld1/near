import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { journeyByKey, journeyStepCardId } from "@/lib/journeys";
import { JourneyView } from "@/features/viajes/journey-view";
import { LiveRefresh } from "@/components/live-refresh";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { journeyKey: string } }): Metadata {
  const journey = journeyByKey(params.journeyKey);
  return { title: journey ? journey.title : "Viaje" };
}

export default async function JourneyPage({ params }: { params: { journeyKey: string } }) {
  const journey = journeyByKey(params.journeyKey);
  if (!journey) notFound();

  const { user, partner } = await requireCouple();
  const cardIds = journey.steps.map((_, i) => journeyStepCardId(journey.key, i));
  const userIds = partner ? [user.id, partner.id] : [user.id];
  const answers = await prisma.cardAnswer.findMany({
    where: { cardId: { in: cardIds }, userId: { in: userIds } },
    select: { cardId: true, userId: true, answer: true }
  });
  const byKey = new Map<string, string>();
  for (const a of answers) byKey.set(`${a.cardId}|${a.userId}`, a.answer);

  const initial = journey.steps.map((step, i) => {
    const cardId = journeyStepCardId(journey.key, i);
    const myAnswer = byKey.get(`${cardId}|${user.id}`) ?? null;
    const partnerRaw = partner ? byKey.get(`${cardId}|${partner.id}`) ?? null : null;
    return {
      cardId,
      title: step.title,
      intro: step.intro,
      prompt: step.prompt,
      myAnswer,
      partnerAnswered: partnerRaw !== null,
      // reciprocidad: la suya solo se revela si YO he respondido
      partnerAnswer: myAnswer ? partnerRaw : null,
      // "completo" = ambos han respondido (independiente de la reciprocidad al ver)
      complete: myAnswer !== null && partnerRaw !== null
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      {/* el paso que responde la pareja avanza el viaje en vivo (it51) */}
      <LiveRefresh types={["event"]} />
      <JourneyView
        journey={{
          journeyKey: journey.key,
          title: journey.title,
          subtitle: journey.subtitle,
          accent: journey.accent
        }}
        partnerName={partner?.name ?? "tu pareja"}
        initial={initial}
      />
    </div>
  );
}
