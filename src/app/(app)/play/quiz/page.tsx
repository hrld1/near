import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gamepad2, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/live-refresh";
import { Quiz, type QuizItem } from "@/features/play/quiz";

export const metadata: Metadata = { title: "Nos conocemos?" };
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const { user, couple, partner } = await requireCouple();

  const [questions, answers] = await Promise.all([
    prisma.quizQuestion.findMany({ orderBy: { id: "asc" } }),
    prisma.quizAnswer.findMany({ where: { coupleId: couple.id } })
  ]);

  const items: QuizItem[] = questions.map((question) => {
    const mine = answers.find((a) => a.questionId === question.id && a.userId === user.id) ?? null;
    const partnerAnswer = partner
      ? answers.find((a) => a.questionId === question.id && a.userId === partner.id) ?? null
      : null;
    return {
      id: question.id,
      text: question.text,
      options: question.options,
      mine: mine ? { selfIndex: mine.selfIndex, guessIndex: mine.guessIndex } : null,
      partner: mine && partnerAnswer
        ? { selfIndex: partnerAnswer.selfIndex, guessIndex: partnerAnswer.guessIndex }
        : null
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
            <HeartHandshake className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">¿Cuánto nos conocemos?</h1>
        </div>
        <p className="mt-2 text-read text-ink-soft">
          Cada uno responde por si misma/o y apuesta por la respuesta del otro.
        </p>
      </header>

      {questions.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="Aún no hay preguntas"
          description="Este juego todavía no tiene su baraja preparada."
        />
      ) : (
        <Quiz items={items} myName={user.name} partnerName={partner?.name ?? "tu pareja"} />
      )}
    </div>
  );
}
