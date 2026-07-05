import { prisma } from "@/lib/db";
import { notifyPartner } from "@/lib/notify";

// Entrega ON-READ (sin cron): al abrir la app, las cartas cuyo deliverAt ya
// pasó y que aún no se han anunciado marcan pushSentAt, avisan al receptor
// (push si está desconectado) y publican letter:delivered. Idempotente: el
// guard de pushSentAt evita duplicar el aviso aunque ambos abran a la vez.
export async function deliverDueLetters(coupleId: string) {
  const due = await prisma.letter.findMany({
    where: { coupleId, deliverAt: { lte: new Date() }, pushSentAt: null },
    include: { couple: { include: { members: { select: { id: true } } } } }
  });
  for (const letter of due) {
    const recipientId = letter.couple.members.find((m) => m.id !== letter.authorId)?.id ?? null;
    // marcamos primero: aunque el aviso falle, no se reintenta en bucle
    await prisma.letter.update({ where: { id: letter.id }, data: { pushSentAt: new Date() } });
    if (!recipientId) continue;
    notifyPartner(
      coupleId,
      recipientId,
      { type: "letter:delivered", payload: { toId: recipientId } },
      { title: "Te ha llegado una carta 💌", body: "Ábrela en Near", url: "/letters", tag: "near-letter" }
    );
  }
}
