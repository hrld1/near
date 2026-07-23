import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, BookHeart, CalendarClock, Heart, HeartHandshake, Sprout, StickyNote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { moodInfo, presenceInfo } from "@/lib/utils";
import { dayKeyIn, nextAnniversary, shiftDayKey } from "@/lib/dates";
import { coupleAgeDays, discoveryOfDay, type FirstStepKey } from "@/lib/first-days";
import { effectivePresence } from "@/lib/presence";
import { isUserOnline } from "@/lib/realtime";
import { agoLabel, dateLong, dayInTz, timeInTz } from "@/lib/format";
import { futureIntervals, overlapIntervals } from "@/lib/overlap";
import { getCoupleStreak, getDailyMissions, getWeeklyBonusStatus, POINTS } from "@/lib/engagement";
import { computeStreak } from "@/lib/engagement-core";
import { momentThemeOfDay } from "@/lib/moment-of-day";
import { eventIcon } from "@/components/product-icons";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { LiveRefresh } from "@/components/live-refresh";
import { Countdown } from "@/features/home/countdown";
import { PresencePicker } from "@/features/home/presence-picker";
import { MoodCheck } from "@/features/home/mood-check";
import { NudgeButton } from "@/features/home/nudge-button";
import { TouchButton } from "@/features/home/touch-button";
import { PartnerOnline } from "@/features/presence/partner-online";
import { PromptCard } from "@/features/home/prompt-card";
import { NoteForm } from "@/features/home/note-form";
import { StreakMissions } from "@/features/home/streak-missions";
import { DailyBox } from "@/features/home/daily-box";
import { MomentOfDay } from "@/features/home/moment-of-day";
import { MoreOfToday } from "@/features/home/more-of-today";
import { PartnerSky } from "@/features/home/partner-sky";
import { PartnerClock } from "@/features/home/partner-clock";
import { FirstDay, type FirstDayProgress } from "@/features/home/first-day";
import { DiscoveryCard } from "@/features/home/discovery-card";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 7) return "¿Sigues despierta/o?";
  if (hour < 13) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HomePage() {
  const { user, couple, partner } = await requireCouple();
  const coupleDay = dayKeyIn(couple.timezone);
  const userDay = dayKeyIn(user.timezone);
  const now = new Date();

  const [myMood, partnerMood, nextEvents, latestMoment, notes, lastNudge, myLastNudge, promptCount, promptAnswers, streakInfo, missionInfo, weeklyBonus, dailyBox, myPhotoRow, partnerPhotoRow] =
    await Promise.all([
      // cada mood vive en el día local de su autor
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
      // mi último nudge (para el "visto")
      prisma.nudge.findFirst({
        where: { coupleId: couple.id, fromId: user.id },
        orderBy: { createdAt: "desc" }
      }),
      prisma.dailyPrompt.count(),
      prisma.promptAnswer.findMany({ where: { coupleId: couple.id, dateKey: coupleDay } }),
      // racha/misiones/bonus degradan sin tumbar la home
      getCoupleStreak(couple.id, couple.members.map((m) => m.id), couple.timezone).catch(
        () => ({ streak: 0, todayComplete: false, graceDay: null })
      ),
      getDailyMissions(couple.id, user.id, { coupleDay, userDay, userTimezone: user.timezone }).catch(
        () => ({ missions: [], allDone: false, bonusClaimed: false })
      ),
      getWeeklyBonusStatus(
        couple.id,
        user.id,
        couple.members.map((m) => m.id),
        couple.timezone
      ).catch(() => null),
      prisma.dailyBox.findUnique({
        where: { coupleId_dateKey: { coupleId: couple.id, dateKey: coupleDay } }
      }),
      // foto del día: la mía (mi día local) y la de mi pareja (su día local)
      prisma.dailyPhoto.findUnique({
        where: { userId_dateKey: { userId: user.id, dateKey: userDay } }
      }),
      partner
        ? prisma.dailyPhoto.findUnique({
            where: {
              userId_dateKey: { userId: partner.id, dateKey: dayKeyIn(partner.timezone) }
            }
          })
        : null
    ]);

  // la pregunta rota con el día de la pareja: ambos ven la misma
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
  // presencia con caducidad: un "Libre" antiguo vuelve a "Sin estado"
  const partnerEffective = partner
    ? effectivePresence(partner.presence, partner.presenceUpdatedAt)
    : "NONE";
  const partnerPresence = partner ? presenceInfo(partnerEffective) : null;
  const boxOpenedBy = dailyBox
    ? couple.members.find((m) => m.id === dailyBox.openedById)?.name ?? null
    : null;
  const milestone = couple.anniversary ? nextAnniversary(couple.anniversary, now) : null;
  const CountdownIcon = countdownEvent ? eventIcon(countdownEvent.kind) : null;
  const myPhoto = myPhotoRow ? { imageUrl: myPhotoRow.imageUrl, caption: myPhotoRow.caption } : null;
  const partnerPhoto = partnerPhotoRow
    ? { imageUrl: partnerPhotoRow.imageUrl, caption: partnerPhotoRow.caption }
    : null;

  // El momento de hoy: tema compartido + revelación recíproca + racha de días
  // seguidos en que LOS DOS lo hicieron (misma lógica que la racha de pareja).
  const momentTheme = momentThemeOfDay(coupleDay);
  const iRevealed = !!myPhotoRow; // he compartido → puedo ver el suyo
  const recentPhotos = partner
    ? await prisma.dailyPhoto.findMany({
        where: { coupleId: couple.id, dateKey: { gte: shiftDayKey(coupleDay, -40) } },
        select: { userId: true, dateKey: true }
      })
    : [];
  const photoByDay = new Map<string, Set<string>>();
  for (const row of recentPhotos) {
    if (!photoByDay.has(row.dateKey)) photoByDay.set(row.dateKey, new Set());
    photoByDay.get(row.dateKey)!.add(row.userId);
  }
  const momentStreak = partner
    ? computeStreak(photoByDay, couple.members.map((m) => m.id), coupleDay).streak
    : 0;

  // Coincidir: la próxima franja libre en común
  const freeSlots = partner
    ? await prisma.freeSlot.findMany({
        where: { coupleId: couple.id, endsAt: { gte: now } },
        orderBy: { startsAt: "asc" }
      })
    : [];
  const nowMs = now.getTime();
  const freeIv = (uid: string) =>
    futureIntervals(
      freeSlots.filter((s) => s.userId === uid).map((s) => ({ start: s.startsAt.getTime(), end: s.endsAt.getTime() })),
      nowMs
    );
  const nextOverlap = partner ? overlapIntervals(freeIv(user.id), freeIv(partner.id))[0] ?? null : null;

  // El primer día y la primera semana (it30): solo para parejas recién nacidas.
  // Los pasos se derivan de "¿existe ALGÚN registro?" — descubrir, no repetir —
  // y las queries extra solo corren durante esa semana.
  const ageDays = partner ? coupleAgeDays(couple.createdAt, couple.timezone, now) : 0;
  let firstDay: { me: FirstDayProgress; partner: FirstDayProgress } | null = null;
  if (partner && ageDays >= 1 && ageDays <= 7) {
    const [myMoodEver, partnerMoodEver, myAnswerEver, partnerAnswerEver, myPhotoEver, partnerPhotoEver, eventCount] =
      await Promise.all([
        prisma.moodEntry.findFirst({ where: { userId: user.id }, select: { id: true } }),
        prisma.moodEntry.findFirst({ where: { userId: partner.id }, select: { id: true } }),
        prisma.promptAnswer.findFirst({ where: { userId: user.id }, select: { id: true } }),
        prisma.promptAnswer.findFirst({ where: { userId: partner.id }, select: { id: true } }),
        prisma.dailyPhoto.findFirst({ where: { userId: user.id }, select: { id: true } }),
        prisma.dailyPhoto.findFirst({ where: { userId: partner.id }, select: { id: true } }),
        prisma.calendarEvent.count({ where: { coupleId: couple.id } })
      ]);
    const me: FirstDayProgress = {
      estado: user.presence !== "NONE" || !!myMoodEver,
      pregunta: !!myAnswerEver,
      momento: !!myPhotoEver,
      fecha: eventCount > 0
    };
    const other: FirstDayProgress = {
      estado: partner.presence !== "NONE" || !!partnerMoodEver,
      pregunta: !!partnerAnswerEver,
      momento: !!partnerPhotoEver,
      fecha: eventCount > 0
    };
    const bothComplete = Object.values(me).every(Boolean) && Object.values(other).every(Boolean);
    if (!bothComplete) firstDay = { me, partner: other };
  }
  const discovery = partner && !firstDay ? discoveryOfDay(ageDays) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <LiveRefresh types={["presence", "mood", "note", "prompt", "event", "moment", "nudge", "box:opened", "season", "game:score"]} />

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-soft">
            {format(now, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight text-ink md:text-5xl">
            {greeting()}, <em className="italic text-rose-deep">{user.name}</em>
          </h1>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            ¿Qué haces ahora? · lo ve {partner?.name ?? "tu pareja"}
          </p>
          <PresencePicker current={effectivePresence(user.presence, user.presenceUpdatedAt)} />
        </div>
      </header>

      {/* VUESTRO PRIMER DÍA / LA PRIMERA SEMANA (it30): el mismo hueco, arriba
          del todo — la lista el día 1, un descubrimiento al día después */}
      {partner && firstDay && (
        <div className="mb-4">
          <FirstDay partnerName={partner.name} me={firstDay.me} partner={firstDay.partner} />
        </div>
      )}
      {discovery && (
        <div className="mb-4">
          <DiscoveryCard discovery={discovery} />
        </div>
      )}

      {/* HERO: la otra persona + la próxima fecha */}
      <section className="mb-4 overflow-hidden rounded-3xl border border-rose/15 bg-gradient-to-br from-rose-faint via-paper to-paper shadow-card">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="p-6 md:p-7">
            {partner ? (
              <>
                {lastNudge && (
                  <p className="mb-4 inline-flex animate-fade-up items-center gap-2 rounded-full bg-rose/10 px-3.5 py-1.5 text-xs font-medium text-rose-deep">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    {partner.name} pensó en ti {agoLabel(lastNudge.createdAt)}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="relative">
                    <Avatar name={partner.name} size="lg" tone={1} className="h-16 w-16 text-xl" />
                    {partnerPresence && partnerEffective !== "NONE" && (
                      <span
                        className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-paper ${partnerPresence.dot}`}
                      />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight text-ink">{partner.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-soft">
                      <PartnerOnline partnerId={partner.id} initialOnline={isUserOnline(partner.id)} />
                      {partnerPresence && partnerEffective !== "NONE" && (
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
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-deep">
                        Nota de {partner.name}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink">{partnerNote.body}</p>
                    </div>
                  </div>
                )}
                {/* su cielo, vivo, aquí mismo (it27) — sustituye al botón plano */}
                <div className="mt-4">
                  <PartnerSky name={partner.name} timezone={partner.timezone} />
                </div>
                <div className="mt-3 flex max-w-xs flex-col gap-2">
                  <NudgeButton
                    partnerName={partner.name}
                    lastNudge={
                      myLastNudge
                        ? { id: myLastNudge.id, seen: !!myLastNudge.seenAt }
                        : null
                    }
                  />
                  <TouchButton partnerName={partner.name} />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Aún no hay nadie vinculado.</p>
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
                <p className="mt-3 text-xs text-ink-soft">
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
                  Próxima fecha
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

      {/* EL RITUAL DEL DÍA: el corazón de Hoy, antes que nada más */}
      {partner && (
        <div className="mb-4">
          <MomentOfDay
            myId={user.id}
            theme={momentTheme}
            partnerName={partner.name}
            streak={momentStreak}
            initialMyPhoto={myPhoto}
            initialPartnerPhoto={iRevealed ? partnerPhoto : null}
            partnerPostedInitial={!!partnerPhotoRow}
          />
        </div>
      )}

      {/* RITUAL, parte 2: la pregunta del día como protagonista (una sola
          pregunta en grande), y tu ánimo debajo. */}
      {prompt ? (
        <div className="mb-4">
          <PromptCard
            promptId={prompt.id}
            question={prompt.text}
            myAnswer={myPromptAnswer?.answer ?? null}
            partnerAnswer={partnerPromptAnswer?.answer ?? null}
            partnerName={partner?.name ?? null}
          />
        </div>
      ) : (
        <Card className="mb-4">
          <CardTitle>Pregunta del día</CardTitle>
          <p className="mt-3 text-sm text-ink-soft">
            No hay preguntas cargadas. Ejecuta el seed: npm run db:seed
          </p>
        </Card>
      )}
      <div className="mb-4">
        <Card>
          <CardTitle>¿Cómo estás hoy?</CardTitle>
          <div className="mt-3">
            <MoodCheck currentMood={myMood?.mood ?? null} currentNote={myMood?.note ?? null} />
          </div>
        </Card>
      </div>

      {/* Cuidaros y quereros, a un toque (compacto) */}
      {partner && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/cerca"
            className="group flex items-center gap-3 rounded-2xl border border-plum/20 bg-gradient-to-br from-plum/5 to-paper px-4 py-3 shadow-card transition hover:shadow-lift"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose to-plum text-white">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">Cerca de verdad</span>
              <span className="block truncate text-xs text-ink-soft">Un aprecio, una pregunta, el pulso</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-plum transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/reparar"
            className="group flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-paper px-4 py-3 shadow-card transition hover:shadow-lift"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
              <Sprout className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">Reparar</span>
              <span className="block truncate text-xs text-ink-soft">Si hoy ha costado, cerradlo bien</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400" />
          </Link>
        </div>
      )}

      <MoreOfToday>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:row-span-2">
          <CardTitle>Racha y misiones</CardTitle>
          <div className="mt-3">
            <StreakMissions
              streak={streakInfo.streak}
              todayComplete={streakInfo.todayComplete}
              graceDay={streakInfo.graceDay}
              missions={missionInfo.missions}
              allDone={missionInfo.allDone}
              bonusClaimed={missionInfo.bonusClaimed}
              bonusPoints={POINTS.missionBonus}
              weekly={
                weeklyBonus
                  ? {
                      claimable: weeklyBonus.claimable,
                      claimed: weeklyBonus.claimed,
                      thisWeekDaysComplete: weeklyBonus.thisWeekDaysComplete,
                      points: POINTS.weeklyBonus
                    }
                  : null
              }
            />
          </div>
        </Card>

        <Card>
          <CardTitle>La caja del día</CardTitle>
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

        {partner && (
          <Card>
            <CardTitle>Coincidir</CardTitle>
            <div className="mt-3">
              {nextOverlap ? (
                <Link href="/coincidir" className="group block">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Próxima ventana en común
                  </p>
                  <p className="mt-1 font-display text-xl text-ink">
                    {dayInTz(new Date(nextOverlap.start), user.timezone)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {timeInTz(new Date(nextOverlap.start), user.timezone)}–
                    {timeInTz(new Date(nextOverlap.end), user.timezone)} tu hora
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition group-hover:gap-1.5 dark:text-emerald-400">
                    Ver y proponer llamada <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ) : (
                <Link href="/coincidir" className="group flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      ¿Cuándo habláis?
                    </p>
                    <p className="text-xs text-ink-soft">Marcad cuándo estáis libres y encontrad un hueco.</p>
                  </div>
                </Link>
              )}
            </div>
          </Card>
        )}

        {milestone && (
          <Card>
            <CardTitle>{milestone.isAnnual ? "Vuestro aniversario" : "Mesiversario"}</CardTitle>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
                <Heart className="h-6 w-6 fill-current" />
              </span>
              <div>
                <p className="font-display text-xl leading-tight text-ink">
                  {milestone.daysLeft === 0
                    ? milestone.isAnnual
                      ? `Hoy cumplís ${milestone.years} ${milestone.years === 1 ? "año" : "años"} 🎉`
                      : `Hoy cumplís ${milestone.months} meses 🎉`
                    : milestone.isAnnual
                      ? `${milestone.years} ${milestone.years === 1 ? "año" : "años"} en ${milestone.daysLeft} ${milestone.daysLeft === 1 ? "día" : "días"}`
                      : `${milestone.months} meses en ${milestone.daysLeft} ${milestone.daysLeft === 1 ? "día" : "días"}`}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {dateLong(milestone.date)}
                </p>
              </div>
            </div>
          </Card>
        )}

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
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  Último momento
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
              <p className="text-sm font-medium text-ink">El diario está vacío</p>
              <p className="text-xs text-ink-soft">Guardad la primera foto o recuerdo</p>
            </Link>
          )}
        </Card>

        <Card className="md:col-span-3">
          <CardTitle>Tu nota para {partner?.name ?? "tu pareja"}</CardTitle>
          <p className="mt-0.5 text-xs text-ink-soft">Una línea suya que verá al abrir su Hoy.</p>
          <div className="mt-3">
            <NoteForm current={myNote?.body ?? null} />
          </div>
        </Card>
      </div>
      </MoreOfToday>
    </div>
  );
}
