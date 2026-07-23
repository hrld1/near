import type { Metadata } from "next";
import { CalendarClock, Gamepad2, HeartHandshake, MonitorPlay, Moon, Paintbrush, Sparkles, Users, WandSparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { aiEnabled } from "@/lib/ai";
import { isUserOnline } from "@/lib/realtime";
import { dayKeyIn } from "@/lib/dates";
import { gameOfDay } from "@/lib/games";
import { skyForHour } from "@/lib/sky";
import { agoLabel, dayInTz, timeInTz } from "@/lib/format";
import { futureIntervals, overlapIntervals } from "@/lib/overlap";
import { PartnerOnline } from "@/features/presence/partner-online";
import { HubGrid, type HubItem } from "@/features/hub/hub-card";

export const metadata: Metadata = { title: "Juntos" };
export const dynamic = "force-dynamic";

// Hub "Juntos": todo lo que se hace A LA VEZ. Una pantalla, acciones claras,
// y en cada tarjeta una señal de lo que está vivo ahí ahora mismo (it29):
// un hub sin contexto es un menú, no un producto.
export default async function JuntosPage() {
  const { user, couple, partner } = await requireCouple();
  const partnerName = partner?.name ?? "tu pareja";
  const partnerOnline = partner ? isUserOnline(partner.id) : false;
  const now = new Date();

  const [freeSlots, roomState, lastAppreciation] = await Promise.all([
    partner
      ? prisma.freeSlot.findMany({
          where: { coupleId: couple.id, endsAt: { gte: now } },
          orderBy: { startsAt: "asc" }
        })
      : [],
    prisma.dateRoomState.findUnique({ where: { coupleId: couple.id } }),
    partner
      ? prisma.appreciation.findFirst({
          where: { coupleId: couple.id, fromId: partner.id },
          orderBy: { createdAt: "desc" }
        })
      : null
  ]);

  // la próxima ventana en común (misma intersección UTC que Hoy y /coincidir)
  const nowMs = now.getTime();
  const freeIv = (uid: string) =>
    futureIntervals(
      freeSlots.filter((s) => s.userId === uid).map((s) => ({ start: s.startsAt.getTime(), end: s.endsAt.getTime() })),
      nowMs
    );
  const nextOverlap = partner ? overlapIntervals(freeIv(user.id), freeIv(partner.id))[0] ?? null : null;

  // el cielo y la hora de tu pareja, para la tarjeta "Estar juntos"
  const partnerHour = partner
    ? Number(
        new Intl.DateTimeFormat("en-GB", { timeZone: partner.timezone, hour: "2-digit", hour12: false }).format(now)
      ) % 24
    : null;
  const partnerSky = partnerHour !== null && Number.isFinite(partnerHour) ? skyForHour(partnerHour) : null;

  const dailyGame = gameOfDay(dayKeyIn(couple.timezone));

  const items: HubItem[] = [
    // La planificadora de citas con IA: solo si la instancia tiene clave
    ...(aiEnabled()
      ? [
          {
            href: "/citas",
            title: "Planear una cita",
            description: "Cuéntale la cita que os apetece y os la deja lista: sitios reales o una cita a distancia.",
            icon: WandSparkles
          } satisfies HubItem
        ]
      : []),
    {
      href: "/cerca",
      title: "Cerca de verdad",
      description: "Aprecio, preguntas para conoceros más y el pulso de la semana.",
      icon: HeartHandshake,
      live: lastAppreciation
        ? `Aprecio de ${partnerName} ${agoLabel(lastAppreciation.createdAt)}`
        : undefined
    },
    {
      href: "/coincidir",
      title: "Coincidir",
      description: "Marcad cuándo estáis libres y encontrad un hueco para hablar, en las dos horas.",
      icon: CalendarClock,
      live: nextOverlap
        ? `Próxima ventana: ${dayInTz(new Date(nextOverlap.start), user.timezone)} · ${timeInTz(new Date(nextOverlap.start), user.timezone)} tu hora`
        : undefined
    },
    {
      href: "/together",
      title: "Estar juntos",
      description: "Su cielo, su hora y cómo está ahora mismo. Para dejarla abierta.",
      icon: Moon,
      live:
        partner && partnerSky
          ? `Allí ${partnerSky.label} · son las ${timeInTz(now, partner.timezone)}`
          : undefined
    },
    {
      href: "/date-room",
      title: "Ver juntos",
      description: "Un vídeo o una peli sincronizados, con videollamada y chat propio.",
      icon: MonitorPlay,
      live: roomState?.videoTitle ? `En la sala: ${roomState.videoTitle}` : undefined
    },
    {
      href: "/canvas",
      title: "Lienzo",
      description: "Dibujáis a la vez sobre el mismo papel. Se guarda en el álbum.",
      icon: Paintbrush
    },
    {
      href: "/play",
      title: "Jugar",
      description: "Arcade con retos diarios y duelos en vivo, cara a cara.",
      icon: Gamepad2,
      live: `Reto de hoy: ${dailyGame.name}`
    }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-5xl md:px-8 md:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
            <Users className="h-5 w-5" />
          </span>
          <h1 className="font-display text-3xl text-ink">Juntos</h1>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
          Cosas para hacer a la vez.
          {partner && (
            <span className="inline-flex items-center gap-1.5">
              <PartnerOnline partnerId={partner.id} initialOnline={partnerOnline} />
            </span>
          )}
        </p>
      </header>

      {partnerOnline && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" />
          {partnerName} está en Near ahora: buen momento para coincidir.
        </div>
      )}

      <HubGrid items={items} />
    </div>
  );
}
