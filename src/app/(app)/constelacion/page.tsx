import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { resolveCard } from "@/lib/decks";
import { Constellation, type Star } from "@/features/constellation/constellation";

export const metadata: Metadata = { title: "Vuestra constelación" };
export const dynamic = "force-dynamic";

// Vuestra constelación (it41): toda vuestra historia como un cielo por el que
// navegar. Cada foto, cita, recuerdo y frase es una estrella colocada en el
// tiempo. El zoom es semántico: de lejos se ven los AÑOS; al acercarte, los
// MESES con sus fotos y citas; más cerca aún, las FRASES. Aquí solo se cargan
// los datos; el cielo y su física viven en el componente cliente.
export default async function ConstelacionPage() {
  const { couple, user, partner } = await requireCouple();

  const names = new Map<string, string>();
  for (const m of couple.members) names.set(m.id, m.name);
  const nameOf = (id: string) => names.get(id) ?? "";

  const [moments, events, appreciations, prompts, cards] = await Promise.all([
    prisma.moment.findMany({
      where: { coupleId: couple.id },
      select: { id: true, imageUrl: true, title: true, body: true, happenedAt: true, authorId: true },
      orderBy: { happenedAt: "asc" }
    }),
    prisma.calendarEvent.findMany({
      where: { coupleId: couple.id },
      select: { id: true, title: true, kind: true, startsAt: true },
      orderBy: { startsAt: "asc" }
    }),
    prisma.appreciation.findMany({
      where: { coupleId: couple.id },
      select: { id: true, body: true, createdAt: true, fromId: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.promptAnswer.findMany({
      where: { coupleId: couple.id },
      select: { id: true, answer: true, createdAt: true, userId: true, prompt: { select: { text: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.cardAnswer.findMany({
      where: { coupleId: couple.id },
      select: { id: true, cardId: true, answer: true, createdAt: true, userId: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const clip = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

  const stars: Star[] = [];
  for (const m of moments) {
    stars.push({
      id: `mo-${m.id}`,
      type: m.imageUrl ? "photo" : "recuerdo",
      date: m.happenedAt.toISOString(),
      title: m.title ?? null,
      text: m.body ? clip(m.body) : null,
      imageUrl: m.imageUrl ?? null,
      author: nameOf(m.authorId)
    });
  }
  for (const e of events) {
    stars.push({
      id: `ev-${e.id}`,
      type: "cita",
      date: e.startsAt.toISOString(),
      title: e.title,
      text: null,
      imageUrl: null,
      author: null,
      kind: e.kind
    });
  }
  for (const a of appreciations) {
    stars.push({
      id: `ap-${a.id}`,
      type: "frase",
      date: a.createdAt.toISOString(),
      title: `${nameOf(a.fromId)} admira`,
      text: clip(a.body),
      imageUrl: null,
      author: nameOf(a.fromId)
    });
  }
  for (const p of prompts) {
    stars.push({
      id: `pa-${p.id}`,
      type: "frase",
      date: p.createdAt.toISOString(),
      title: p.prompt?.text ? clip(p.prompt.text, 60) : "Pregunta del día",
      text: clip(p.answer),
      imageUrl: null,
      author: nameOf(p.userId)
    });
  }
  for (const c of cards) {
    const resolved = resolveCard(c.cardId);
    stars.push({
      id: `ca-${c.id}`,
      type: "frase",
      date: c.createdAt.toISOString(),
      title: resolved ? clip(resolved.text, 60) : "Carta",
      text: clip(c.answer),
      imageUrl: null,
      author: nameOf(c.userId)
    });
  }

  stars.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Constellation
      stars={stars}
      since={couple.createdAt.toISOString()}
      you={user.name}
      partner={partner?.name ?? null}
    />
  );
}
