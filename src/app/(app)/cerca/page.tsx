import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { dayKeyIn, mondayOfWeek } from "@/lib/dates";
import { DECKS, makeCardId } from "@/lib/decks";
import { AppreciationBox } from "@/features/cerca/appreciation-box";
import { PulseCard } from "@/features/cerca/pulse-card";
import { DeckGrid, type DeckProgress } from "@/features/cerca/deck-grid";

export const metadata: Metadata = { title: "Cerca" };
export const dynamic = "force-dynamic";

export default async function CercaPage() {
  const { user, couple, partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";
  const weekKey = mondayOfWeek(dayKeyIn(couple.timezone));
  const memberIds = couple.members.map((m) => m.id);

  const [appreciations, cardAnswers, pulses] = await Promise.all([
    prisma.appreciation.findMany({
      where: { coupleId: couple.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { from: { select: { name: true } } }
    }),
    prisma.cardAnswer.findMany({
      where: { coupleId: couple.id },
      select: { cardId: true, userId: true }
    }),
    prisma.weeklyPulse.findMany({ where: { coupleId: couple.id, weekKey } })
  ]);

  // progreso por mazo: una carta cuenta como "revelada" si AMBOS respondieron
  const usersByCard = new Map<string, Set<string>>();
  for (const a of cardAnswers) {
    if (!usersByCard.has(a.cardId)) usersByCard.set(a.cardId, new Set());
    usersByCard.get(a.cardId)!.add(a.userId);
  }
  const deckItems: DeckProgress[] = DECKS.map((deck) => {
    let revealed = 0;
    for (let i = 0; i < deck.cards.length; i++) {
      const set = usersByCard.get(makeCardId(deck.key, i));
      if (set && memberIds.every((id) => set.has(id)) && memberIds.length === 2) revealed++;
    }
    return {
      key: deck.key,
      name: deck.name,
      icon: deck.icon,
      tagline: deck.tagline,
      accent: deck.accent,
      soft: deck.soft,
      text: deck.text,
      intimate: deck.intimate,
      total: deck.cards.length,
      revealed
    };
  });

  const initialAppr = appreciations.map((a) => ({
    id: a.id,
    fromId: a.fromId,
    fromName: a.from.name,
    body: a.body,
    createdAt: a.createdAt.toISOString()
  }));

  const minePulse = pulses.find((p) => p.userId === user.id) ?? null;
  const partnerPulse = partner ? pulses.find((p) => p.userId === partner.id) ?? null : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Cerca</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Un rincón para quereros y conoceros más — no para pasar el rato.
        </p>
      </header>

      <div className="space-y-5">
        <PulseCard
          initialMine={minePulse ? { value: minePulse.value, note: minePulse.note } : null}
          partner={partnerPulse ? { value: partnerPulse.value, note: partnerPulse.note } : null}
          partnerName={partnerName}
        />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Mazos de preguntas</h2>
          <DeckGrid items={deckItems} />
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">El frasco de aprecio</h2>
          <AppreciationBox myId={user.id} myName={user.name} partnerName={partnerName} initial={initialAppr} />
        </section>
      </div>
    </div>
  );
}
