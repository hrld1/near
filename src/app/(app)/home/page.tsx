import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  BookHeart,
  CalendarHeart,
  Heart,
  MessageCircle,
  MonitorPlay,
  StickyNote
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { moodInfo, presenceInfo } from "@/lib/utils";
import { dayKeyIn } from "@/lib/dates";
import { agoLabel, dateLong } from "@/lib/format";
import { getCoupleStreak, getDailyMissions, POINTS } from "@/lib/engagement";
import { eventIcon } from "@/components/product-icons";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { LiveRefresh } from "@/components/live-refresh";
import { Countdown } from "@/features/home/countdown";
import { PresencePicker } from "@/features/home/presence-picker";
import { MoodCheck } from "@/features/home/mood-check";
import { NudgeButton } from "@/features/home/nudge-button";
import { PromptCard } from "@/features/home/prompt-card";
import { NoteForm } from "@/features/home/note-form";
import { StreakMissions } from "@/features/home/streak-missions";
import { DailyBox } from "@/features/home/daily-box";
import { PartnerClock } from "@/features/home/partner-clock";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 7) return "Sigues despierta/o?";
  if (hour < 13) return "Buenos dias";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HomePage() {
  const { user, couple, partner } = await requireCouple();
  const coupleDay = dayKeyIn(couple.timezone);
  const userDay = dayKeyIn(user.timezone);
  const now = new Date();

  const [myMood, partnerMood, nextEvents, latestMoment, notes, lastNudge, promptCount, promptAnswers, streakInfo, missionInfo, dailyBox] =
    await Promise.all([
      // cada mood vive en el dia local de su autor
      prisma.moodEntry.findUnique({
        where: { userId_dateKey: { userId: user.id, dateKey: userDay } }
      }),
      partner
        ? prisma.moodEntry.findUnique({
            where: { userId_dateKey: { userId: partner.id, dateKey: dayKeyIn(partner.timezone) } }
          })
        : null,
      prisma.calendarEvent.findMany({
        where: { coupleId: couple.id, startsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        take: 3
      }),
      prisma.moment.findFirst({
        where: { coupleId: couple.id },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } }
      }),
      prisma.note.findMany({ where: { coupleId: couple.id } }),
      partner
        ? prisma.nudge.findFirst({
            where: {
              coupleId: couple.id,
              fromId: partner.id,
              createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            orderBy: { createdAt: "desc" }
          })
        : null,
      prisma.dailyPrompt.count(),
      prisma.promptAnswer.findMany({ where: { coupleId: couple.id, dateKey: coupleDay } }),
      getCoupleStreak(couple.id, couple.members.map((m) => m.id), couple.timezone),
      getDailyMissions(couple.id, user.id, { coupleDay, userDay, userTimezone: user.timezone }),
      prisma.dailyBox.findUnique({
        where: { coupleId_dateKey: { coupleId: couple.id, dateKey: coupleDay } }
      })
    ]);

  // la pregunta rota con el dia de la pareja: ambos ven la misma
  const [cy, cm, cd] = coupleDay.split("-").map(Number);
  const dayOfYear = Math.floor((Date.UTC(cy, cm - 1, cd) - Date.UTC(cy, 0, 0)) / 86_400_000);
  const prompt =
    promptCount > 0
      ? await prisma.dailyPrompt.findFirst({
          orderBy: { id: "asc" },
          skip: dayOfYear % promptCount
        })
      : null;

  const partnerNote = partner ? notes.find((n) => n.authorId === partner.id) ?? null : null;
  const myNote = notes.find((n) => n.authorId === user.id) ?? null;
  const myPromptAnswer = promptAnswers.find((a) => a.userId === user.id) ?? null;
  const partnerPromptAnswer = partner
    ? promptAnswers.find((a) => a.userId === partner.id) ?? null
    : null;
  const countdownEvent = nextEvents.find((e) => e.showCountdown) ?? nextEvents[0] ?? null;
  const partnerPresence = partner ? presenceInfo(partner.presence) : null;
  const boxOpenedBy = dailyBox
    ? couple.members.find((m) => m.id === dailyBox.openedById)?.name ?? null
    : null;
  const CountdownIcon = countdownEvent ? eventIcon(countdownEvent.kind) : null;

  const quickActions = [
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/moments", label: "Momento", icon: BookHeart },
    { href: "/date-room", label: "Sala", icon: MonitorPlay },
    { href: "/calendar", label: "Fechas", icon: CalendarHeart }
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <LiveRefresh types={["presence", "mood", "note", "prompt", "event", "moment", "nudge", "box:opened", "season", "game:score"]} />

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-soft">
            {format(now, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink md:text-4xl">
            {greeting()}, {user.name}
          </h1>
        </div>
        <PresencePicker current={user.presence} />
      </header>

      {/* HERO: la otra persona + la proxima fecha */}
      <section className="mb-4 overflow-hidden rounded-3xl border border-rose/15 bg-gradient-to-br from-rose-faint via-paper to-paper shadow-card">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="p-6 md:p-7">
            {partner ? (
              <>
                {lastNudge && (
                  <p className="mb-4 inline-flex animate-fade-up items-center gap-2 rounded-full bg-rose/10 px-3.5 py-1.5 text-xs font-medium text-rose-deep">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    {partner.name} penso en ti {agoLabel(lastNudge.createdAt)}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="relative">
                    <Avatar name={partner.name} size="lg" tone={1} className="h-16 w-16 text-xl" />
                    {partnerPresence && partner.presence !== "NONE" && (
                      <span
                        className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-paper ${partnerPresence.dot}`}
                      />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight text-ink">{partner.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-soft">
                      {partnerPresence && partner.presence !== "NONE" && (
                        <span>{partnerPresence.label}</span>
                      )}
                      <PartnerClock timezone={partner.timezone} name={partner.name} />
                    </p>
                    {partnerMood && (
                      <p className="mt-1.5 text-sm text-ink">
                        <span className="mr-1.5">{moodInfo(partnerMood.mood).emoji}</span>
                        Hoy se siente {moodInfo(partnerMood.mood).label.toLowerCase()}
                        {partnerMood.note && (
                          <span className="text-ink-soft"> — “{partnerMood.note}”</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {partnerNote && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-paper/80 px-4 py-3 shadow-card">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-deep">
                        Nota de {partner.name}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink">{partnerNote.body}</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 max-w-xs">
                  <NudgeButton partnerName={partner.name} />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Aun no hay nadie vinculado.</p>
            )}
          </div>

          <div className="relative border-t border-rose/10 bg-paper/60 p-6 md:border-l md:border-t-0 md:p-7">
            {countdownEvent && CountdownIcon ? (
              <>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-deep">
                  <CountdownIcon className="h-4 w-4" />
                  {countdownEvent.title}
                </p>
                <div className="mt-4">
                  <Countdown target={countdownEvent.startsAt.toISOString()} />
                </div>
                <p className="mt-3 text-xs capitalize text-ink-soft">
                  {dateLong(countdownEvent.startsAt)}
                </p>
                <Link
                  href="/calendar"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose transition hover:gap-1.5"
                >
                  Ver todas las fechas <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                  Proxima fecha
                </p>
                <p className="mt-2 font-display text-xl text-ink">Nada en el horizonte</p>
                <p className="mt-1 text-sm text-ink-soft">
                  La distancia pesa menos con una fecha marcada.
                </p>
                <Link
                  href="/calendar"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rose hover:underline"
                >
                  Crear una fecha <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:row-span-2">
          <CardTitle>Racha y misiones</CardTitle>
          <div className="mt-3">
            <StreakMissions
              streak={streakInfo.streak}
              todayComplete={streakInfo.todayComplete}
              missions={missionInfo.missions}
              allDone={missionInfo.allDone}
              bonusClaimed={missionInfo.bonusClaimed}
              bonusPoints={POINTS.missionBonus}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>La caja del dia</CardTitle>
          <div className="mt-3">
            <DailyBox
              initial={
                dailyBox
                  ? { kind: dailyBox.kind, content: dailyBox.content, openedBy: boxOpenedBy }
                  : null
              }
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Como estas hoy?</CardTitle>
          <div className="mt-3">
            <MoodCheck currentMood={myMood?.mood ?? null} currentNote={myMood?.note ?? null} />
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardTitle>Pregunta del dia</CardTitle>
          <div className="mt-3">
            {prompt ? (
              <PromptCard
                promptId={prompt.id}
                question={prompt.text}
                myAnswer={myPromptAnswer?.answer ?? null}
                partnerAnswer={partnerPromptAnswer?.answer ?? null}
                partnerName={partner?.name ?? null}
              />
            ) : (
              <p className="text-sm text-ink-soft">
                No hay preguntas cargadas. Ejecuta el seed: npm run db:seed
              </p>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          {latestMoment ? (
            <Link href="/moments" className="group block h-full">
              {latestMoment.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={latestMoment.imageUrl}
                  alt={latestMoment.title ?? "Momento"}
                  className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-sand to-rose-faint">
                  <BookHeart className="h-8 w-8 text-rose/50" />
                </div>
              )}
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Ultimo momento
                </p>
                {latestMoment.title && (
                  <p className="mt-0.5 truncate font-display text-base text-ink group-hover:text-rose-deep">
                    {latestMoment.title}
                  </p>
                )}
                {!latestMoment.title && latestMoment.body && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-ink">{latestMoment.body}</p>
                )}
                <p className="mt-1 text-xs text-ink-soft">
                  {latestMoment.author.name} · {agoLabel(latestMoment.createdAt)}
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/moments" className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <BookHeart className="h-7 w-7 text-rose/60" />
              <p className="text-sm font-medium text-ink">El diario esta vacio</p>
              <p className="text-xs text-ink-soft">Guardad la primera foto o recuerdo</p>
            </Link>
          )}
        </Card>

        <Card className="md:col-span-3">
          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div>
              <CardTitle>Tu nota para {partner?.name ?? "tu pareja"}</CardTitle>
              <div className="mt-3">
                <NoteForm current={myNote?.body ?? null} />
              </div>
            </div>
            <div className="flex items-center gap-1 border-t border-sand pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-ink-soft transition hover:bg-rose-faint hover:text-rose-deep"
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
