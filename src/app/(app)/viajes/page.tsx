import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { JOURNEYS, journeyStepCardId } from "@/lib/journeys";
import { JourneyList, type JourneyProgress } from "@/features/viajes/journey-list";

export const metadata: Metadata = { title: "Viajes" };
export const dynamic = "force-dynamic";

export default async function ViajesPage() {
  const { user, partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";

  const allCardIds = JOURNEYS.flatMap((j) => j.steps.map((_, i) => journeyStepCardId(j.key, i)));
  const userIds = partner ? [user.id, partner.id] : [user.id];
  const answers = await prisma.cardAnswer.findMany({
    where: { cardId: { in: allCardIds }, userId: { in: userIds } },
    select: { cardId: true, userId: true }
  });
  const answered = new Set(answers.map((a) => `${a.cardId}|${a.userId}`));

  const items: JourneyProgress[] = JOURNEYS.map((j) => {
    const mine = (i: number) => answered.has(`${journeyStepCardId(j.key, i)}|${user.id}`);
    const theirs = (i: number) => !!partner && answered.has(`${journeyStepCardId(j.key, i)}|${partner.id}`);
    const complete = (i: number) => mine(i) && theirs(i);

    let done = 0;
    for (let i = 0; i < j.steps.length; i++) if (complete(i)) done++;

    let status: string;
    if (done === j.steps.length) {
      status = "Completado";
    } else if (done === 0 && !mine(0)) {
      status = "Por empezar";
    } else {
      // el paso vivo = el primero sin cerrar por los dos
      const cur = j.steps.findIndex((_, i) => !complete(i));
      status = mine(cur) ? `Esperas a ${partnerName}` : `Os toca · paso ${cur + 1}`;
    }

    return {
      key: j.key,
      title: j.title,
      subtitle: j.subtitle,
      icon: j.icon,
      accent: j.accent,
      soft: j.soft,
      text: j.text,
      total: j.steps.length,
      done,
      status
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <Compass className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Viajes</h1>
        </div>
        <p className="mt-2 text-read text-ink-soft">
          Recorridos de varios días sobre un tema. Un paso cada vez, y el siguiente se abre cuando lo
          habéis respondido los dos — así no hay prisa, hay costumbre.
        </p>
      </header>

      <JourneyList items={items} />
    </div>
  );
}
