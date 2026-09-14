import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { TRIVIA } from "@/lib/trivia";
import { LiveRefresh } from "@/components/live-refresh";
import { Trivia, type TriviaItem } from "@/features/play/trivia";

export const metadata: Metadata = { title: "Duelo de ingenio" };
export const dynamic = "force-dynamic";

export default async function IngenioPage() {
  const { user, partner } = await requireCouple();

  const answers = await prisma.triviaAnswer.findMany({
    where: { questionId: { in: TRIVIA.map((q) => q.id) }, userId: { in: partner ? [user.id, partner.id] : [user.id] } },
    select: { questionId: true, userId: true, choice: true }
  });
  const byKey = new Map<string, number>();
  for (const a of answers) byKey.set(`${a.questionId}|${a.userId}`, a.choice);

  const items: TriviaItem[] = TRIVIA.map((q) => {
    const myChoice = byKey.get(`${q.id}|${user.id}`) ?? null;
    const partnerRaw = partner ? byKey.get(`${q.id}|${partner.id}`) ?? null : null;
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explain: q.explain,
      myChoice,
      // no se revela la elección de la pareja hasta que YO respondo (ni pista ni copia)
      partnerChoice: myChoice !== null ? partnerRaw : null
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <LiveRefresh types={["quiz"]} />
      <Link
        href="/play"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Arcade
      </Link>
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <Swords className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Duelo de ingenio</h1>
        </div>
        <p className="mt-2 text-read text-ink-soft">
          Acertijos, lógica y curiosidades con respuesta correcta. Cada uno responde por su cuenta y el
          marcador dice quién acierta más.
        </p>
      </header>

      <Trivia items={items} myName={user.name} partnerName={partner?.name ?? "tu pareja"} />
    </div>
  );
}
