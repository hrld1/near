import type { Metadata } from "next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarHeart, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { EVENT_KINDS } from "@/lib/utils";
import { nextAnniversary } from "@/lib/dates";
import { dateLong, agoLabel } from "@/lib/format";
import { eventIcon } from "@/components/product-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/live-refresh";
import { Countdown } from "@/features/home/countdown";
import { EventForm } from "@/features/calendar/event-form";
import { DeleteEvent } from "@/features/calendar/delete-event";

export const metadata: Metadata = { title: "Fechas" };
export const dynamic = "force-dynamic";

function kindLabel(kind: string) {
  return EVENT_KINDS.find((k) => k.key === kind)?.label ?? "Evento";
}

export default async function CalendarPage() {
  const { user, couple, partner } = await requireCouple();
  const now = new Date();

  const events = await prisma.calendarEvent.findMany({
    where: { coupleId: couple.id },
    orderBy: { startsAt: "asc" },
    include: { createdBy: { select: { id: true, name: true } } }
  });

  const upcoming = events.filter((e) => e.startsAt > now);
  const past = events.filter((e) => e.startsAt <= now).reverse();
  const highlight = upcoming.find((e) => e.showCountdown) ?? upcoming[0] ?? null;
  const rest = upcoming.filter((e) => e.id !== highlight?.id);
  const HighlightIcon = highlight ? eventIcon(highlight.kind) : null;
  const milestone = couple.anniversary ? nextAnniversary(couple.anniversary, now) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <LiveRefresh types={["event"]} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Fechas</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Lo que os espera y lo que ya habéis vivido.
          </p>
          {milestone && (
            <p className="mt-1.5 text-xs font-medium text-rose-deep">
              💗{" "}
              {milestone.daysLeft === 0
                ? milestone.isAnnual
                  ? `Hoy cumplís ${milestone.years} ${milestone.years === 1 ? "año" : "años"}`
                  : `Hoy cumplís ${milestone.months} meses`
                : `${milestone.isAnnual ? `${milestone.years} ${milestone.years === 1 ? "año" : "años"}` : `${milestone.months} meses`} el ${format(milestone.date, "d 'de' MMMM", { locale: es })}`}
            </p>
          )}
        </div>
        <EventForm />
      </header>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="Sin fechas a la vista"
          description="La distancia pesa menos cuando hay una fecha marcada. Cread vuestro próximo reencuentro, una cita virtual o un aniversario."
        />
      ) : (
        <div className="space-y-7">
          {highlight && HighlightIcon && (
            <section className="overflow-hidden rounded-3xl border border-rose/20 bg-gradient-to-br from-rose-faint via-paper to-paper shadow-card">
              <div className="p-6 md:p-7">
                <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-rose-deep">
                  <HighlightIcon className="h-4 w-4" />
                  {kindLabel(highlight.kind)} · lo siguiente
                </p>
                <h2 className="mt-1.5 font-display text-3xl leading-tight text-ink">
                  {highlight.title}
                </h2>
                <div className="mt-5">
                  <Countdown target={highlight.startsAt.toISOString()} />
                </div>
                <p className="mt-4 text-sm text-ink-soft">
                  {dateLong(highlight.startsAt)}
                  {highlight.endsAt && (
                    <span> — hasta las {format(highlight.endsAt, "HH:mm")}</span>
                  )}
                </p>
                {highlight.description && (
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink">
                    {highlight.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-ink-soft">
                  Creado por {highlight.createdBy.id === user.id ? "ti" : highlight.createdBy.name}
                </p>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Después de eso
              </h2>
              <div className="space-y-2.5">
                {rest.map((event) => {
                  const Icon = eventIcon(event.kind);
                  return (
                    <div
                      key={event.id}
                      className="group flex items-center gap-4 rounded-2xl border border-sand bg-paper px-4 py-3 shadow-card transition hover:shadow-lift"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-sand">
                        <span className="font-display text-lg leading-none text-ink">
                          {format(event.startsAt, "d")}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-ink-soft">
                          {format(event.startsAt, "MMM", { locale: es })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-rose" />
                          <span className="truncate">{event.title}</span>
                        </p>
                        <p className="text-xs text-ink-soft">
                          {format(event.startsAt, "EEEE 'a las' HH:mm", { locale: es })}
                          {event.endsAt && <>–{format(event.endsAt, "HH:mm")}</>} ·{" "}
                          {agoLabel(event.startsAt)}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 truncate text-xs text-ink-soft">{event.description}</p>
                        )}
                      </div>
                      <DeleteEvent id={event.id} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <History className="h-3.5 w-3.5" />
                Ya vividas ({past.length})
              </h2>
              <div className="rounded-2xl border border-sand bg-paper/50 px-2 py-1">
                {past.slice(0, 10).map((event, index) => {
                  const Icon = eventIcon(event.kind);
                  return (
                    <div
                      key={event.id}
                      className={
                        "group flex items-center gap-3 px-3 py-2.5 text-sm text-ink-soft" +
                        (index > 0 ? " border-t border-sand/60" : "")
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="flex-1 truncate">{event.title}</span>
                      <span className="text-xs">{format(event.startsAt, "d MMM yy", { locale: es })}</span>
                      <DeleteEvent id={event.id} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
