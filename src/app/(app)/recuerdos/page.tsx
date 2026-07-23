import type { Metadata } from "next";
import { BarChart3, BookHeart, CalendarHeart, Mail, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { HubGrid, type HubItem } from "@/features/hub/hub-card";

export const metadata: Metadata = { title: "Recuerdos" };
export const dynamic = "force-dynamic";

// Hub "Recuerdos": vuestra historia a lo largo del tiempo. Cada tarjeta lleva
// una linea de contexto real (cuántas fotos, cartas en camino, próxima fecha).
export default async function RecuerdosPage() {
  const { couple } = await requireCouple();
  const now = new Date();

  const [momentCount, lettersInTransit, nextEvent] = await Promise.all([
    prisma.moment.count({ where: { coupleId: couple.id } }),
    prisma.letter.count({ where: { coupleId: couple.id, deliverAt: { gt: now } } }).catch(() => 0),
    prisma.calendarEvent.findFirst({
      where: { coupleId: couple.id, startsAt: { gt: now } },
      orderBy: { startsAt: "asc" }
    })
  ]);

  const daysToEvent = nextEvent
    ? Math.max(0, Math.ceil((nextEvent.startsAt.getTime() - now.getTime()) / 86_400_000))
    : null;

  const items: HubItem[] = [
    {
      href: "/moments",
      title: "Álbum y diario",
      description: "Vuestras fotos y recuerdos, guardados para siempre.",
      icon: BookHeart,
      live:
        momentCount > 0
          ? `${momentCount} ${momentCount === 1 ? "momento guardado" : "momentos guardados"}`
          : undefined
    },
    {
      href: "/letters",
      title: "Cartas",
      description: "Escribe hoy, llega mañana. O una cápsula para el futuro.",
      icon: Mail,
      live:
        lettersInTransit > 0
          ? `${lettersInTransit} ${lettersInTransit === 1 ? "carta en camino" : "cartas en camino"}`
          : undefined
    },
    {
      href: "/calendar",
      title: "Fechas",
      description: "Marcad vuestro próximo reencuentro y contad los días.",
      icon: CalendarHeart,
      live:
        daysToEvent !== null
          ? daysToEvent === 0
            ? "Vuestra próxima fecha es hoy"
            : `Próxima fecha en ${daysToEvent} ${daysToEvent === 1 ? "día" : "días"}`
          : undefined
    },
    {
      href: "/map",
      title: "Distancia",
      description: "Vuestras dos ciudades, los km, el cielo y el clima del otro.",
      icon: MapPin
    },
    {
      href: "/libro",
      title: "Vuestro libro",
      description: "Vuestro mes o vuestro año, contado por capítulos. Imprimible.",
      icon: BarChart3
    }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl md:px-8 md:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <BookHeart className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Recuerdos</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">Vuestra historia, a un toque.</p>
      </header>
      <HubGrid items={items} />
    </div>
  );
}
