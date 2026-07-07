import { getCurrentUser } from "@/lib/couple";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exporta TODO lo de la pareja en un JSON descargable. Es la red de seguridad
// que hace que borrar/desvincularse no dé miedo: podéis llevaros vuestros
// recuerdos antes. Solo lo pueden pedir los dos miembros (auth por sesión).
// Las imágenes/audios se referencian por URL (siguen sirviéndose mientras
// exista la cuenta); el JSON es el registro de todo lo escrito.
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.coupleId) return new Response("Unauthorized", { status: 401 });
  const coupleId = user.coupleId;

  const [
    couple,
    messages,
    moments,
    letters,
    events,
    notes,
    moods,
    dailyPhotos,
    promptAnswers,
    quizAnswers,
    gameScores,
    dailyBoxes,
    nudges
  ] = await Promise.all([
    prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        members: { select: { id: true, name: true, email: true, timezone: true, city: true, createdAt: true } }
      }
    }),
    prisma.message.findMany({ where: { coupleId }, orderBy: { createdAt: "asc" } }),
    prisma.moment.findMany({
      where: { coupleId },
      orderBy: { happenedAt: "asc" },
      include: { comments: true }
    }),
    prisma.letter.findMany({ where: { coupleId }, orderBy: { createdAt: "asc" } }),
    prisma.calendarEvent.findMany({ where: { coupleId }, orderBy: { startsAt: "asc" } }),
    prisma.note.findMany({ where: { coupleId } }),
    prisma.moodEntry.findMany({ where: { coupleId }, orderBy: { dateKey: "asc" } }),
    prisma.dailyPhoto.findMany({ where: { coupleId }, orderBy: { dateKey: "asc" } }),
    prisma.promptAnswer.findMany({ where: { coupleId }, orderBy: { dateKey: "asc" } }),
    prisma.quizAnswer.findMany({ where: { coupleId } }),
    prisma.gameScore.findMany({ where: { coupleId }, orderBy: { dateKey: "asc" } }),
    prisma.dailyBox.findMany({ where: { coupleId }, orderBy: { dateKey: "asc" } }),
    prisma.nudge.findMany({ where: { coupleId }, orderBy: { createdAt: "asc" } })
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: { id: user.id, name: user.name, email: user.email },
    note: "Todo lo vuestro en Near. Las fotos y audios son enlaces que funcionan mientras exista la cuenta.",
    couple,
    messages,
    moments,
    letters,
    events,
    notes,
    moods,
    dailyPhotos,
    promptAnswers,
    quizAnswers,
    gameScores,
    dailyBoxes,
    nudges
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="near-vuestros-datos-${stamp}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
