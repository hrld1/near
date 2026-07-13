import type { Metadata } from "next";
import Link from "next/link";
import {
  Anchor,
  ChevronRight,
  Crown,
  Flame,
  HeartHandshake,
  Lock,
  Swords
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { dayKeyIn, shiftDayKey } from "@/lib/dates";
import { GAMES, bestOf, compareScores, gameOfDay } from "@/lib/games";
import { DUELS } from "@/lib/duels";
import {
  ACHIEVEMENTS,
  DUEL_CLAIM_TYPE,
  getCoupleStreak,
  getDuelResult,
  getSeason,
  POINTS
} from "@/lib/engagement";
import { gameVisual, levelIcon, achievementIcon } from "@/components/product-icons";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { AchievementsSync } from "@/features/play/achievements-sync";
import { DuelClaim } from "@/features/play/duel-claim";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arcade" };
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const { user, couple, partner } = await requireCouple();
  const dateKey = dayKeyIn(couple.timezone); // la arcade vive en el día de la pareja
  const daily = gameOfDay(dateKey);
  const weekKeys = Array.from({ length: 7 }, (_, i) => shiftDayKey(dateKey, -i)).reverse();
  const duelDay = shiftDayKey(dateKey, -1);

  // Racha, logros y duelo de ayer degradan a vacio si fallan: no tumban la página.
  const [todayScores, weekScores, season, streakInfo, unlockedAchievements, yesterdayDuel, duelClaim] =
    await Promise.all([
      prisma.gameScore.findMany({ where: { coupleId: couple.id, dateKey } }),
      prisma.gameScore.findMany({ where: { coupleId: couple.id, dateKey: { in: weekKeys } } }),
      getSeason(couple.id, couple.timezone),
      getCoupleStreak(couple.id, couple.members.map((m) => m.id), couple.timezone).catch(
        () => ({ streak: 0, todayComplete: false })
      ),
      prisma.achievementUnlock
        .findMany({ where: { userId: user.id }, orderBy: { unlockedAt: "desc" } })
        .catch(() => []),
      getDuelResult(couple.id, duelDay).catch(() => null),
      prisma.dailyClaim
        .findUnique({
          where: {
            userId_dateKey_type: { userId: user.id, dateKey: duelDay, type: DUEL_CLAIM_TYPE }
          }
        })
        .catch(() => null)
    ]);
  const wonYesterdayUnclaimed =
    !!yesterdayDuel && yesterdayDuel.winnerId === user.id && !duelClaim;

  const perGame = GAMES.map((def) => {
    const mine = todayScores.filter((s) => s.gameKey === def.key && s.userId === user.id);
    const theirs = partner
      ? todayScores.filter((s) => s.gameKey === def.key && s.userId === partner.id)
      : [];
    return {
      def,
      myBest: bestOf(def, mine.map((s) => s.score)),
      partnerBest: bestOf(def, theirs.map((s) => s.score)),
      myAttempts: mine.length
    };
  });

  const duel = perGame.find((g) => g.def.key === daily.key)!;
  let duelStatus: "pending" | "me" | "partner" | "tie" | "waiting" = "pending";
  if (duel.myBest !== null && duel.partnerBest !== null) {
    const cmp = compareScores(daily, duel.myBest, duel.partnerBest);
    duelStatus = cmp === 0 ? "tie" : cmp < 0 ? "me" : "partner";
  } else if (duel.myBest !== null) {
    duelStatus = "waiting";
  }

  const history = weekKeys.map((key) => {
    const def = gameOfDay(key);
    const Visual = gameVisual(def.key);
    const mine = bestOf(
      def,
      weekScores.filter((s) => s.dateKey === key && s.gameKey === def.key && s.userId === user.id).map((s) => s.score)
    );
    const theirs = partner
      ? bestOf(
          def,
          weekScores.filter((s) => s.dateKey === key && s.gameKey === def.key && s.userId === partner.id).map((s) => s.score)
        )
      : null;
    let result: "me" | "partner" | "tie" | "none" = "none";
    if (mine !== null && theirs !== null) {
      const cmp = compareScores(def, mine, theirs);
      result = cmp === 0 ? "tie" : cmp < 0 ? "me" : "partner";
    }
    return { key, Icon: Visual.icon, result };
  });

  const myPoints = season.perUser.get(user.id) ?? 0;
  const partnerPoints = partner ? season.perUser.get(partner.id) ?? 0 : 0;
  const unlockedKeys = new Set(unlockedAchievements.map((u) => u.key));
  const DailyVisual = gameVisual(daily.key);
  const DailyIcon = DailyVisual.icon;
  const LevelIcon = levelIcon(season.level.index);

  // Colección "Cara a cara": 4 en raya y Hundir la flota (previos al arnés) +
  // los duelos declarados en lib/duels. Todos son 1v1 por turnos en directo.
  const liveDuels = [
    {
      key: "connect4",
      name: "4 en raya",
      tagline: "Cuatro fichas en línea antes que tu pareja.",
      accent: "from-indigo-400 to-violet-600",
      soft: "bg-indigo-500/12",
      text: "text-indigo-600 dark:text-indigo-400",
      Icon: Swords
    },
    {
      key: "battleship",
      name: "Hundir la flota",
      tagline: "Encuentra su flota antes que ella la tuya.",
      accent: "from-sky-400 to-blue-600",
      soft: "bg-sky-500/12",
      text: "text-sky-600 dark:text-sky-400",
      Icon: Anchor
    },
    ...DUELS.map((d) => ({
      key: d.key,
      name: d.name,
      tagline: d.tagline,
      accent: d.accent,
      soft: d.soft,
      text: d.text,
      Icon: d.icon
    }))
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <LiveRefresh types={["game:score", "season"]} />
      <AchievementsSync />
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Arcade</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Un reto nuevo cada día. Los números deciden quién manda esta semana.
        </p>
      </header>

      {/* Reto del día: duelo VS */}
      <Link href={`/play/${daily.key}`} className="group block">
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift transition group-hover:shadow-xl md:p-7",
            DailyVisual.accent
          )}
        >
          <DailyIcon className="absolute -right-6 -top-6 h-40 w-40 opacity-15 transition duration-500 group-hover:rotate-12 group-hover:scale-110" />
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/85">
            <Swords className="h-4 w-4" /> Reto del día
          </p>
          <h2 className="mt-1 font-display text-3xl">{daily.name}</h2>
          <p className="mt-0.5 max-w-sm text-sm text-white/85">{daily.tagline}</p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-sm sm:gap-5 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar name={user.name} size="sm" className="ring-2 ring-white/40" />
              <div className="min-w-0">
                <p className="truncate text-xs text-white/75">Tú</p>
                <p className="font-display text-lg leading-tight">
                  {duel.myBest !== null ? daily.format(duel.myBest) : "—"}
                </p>
              </div>
            </div>
            <span className="font-display text-xl italic text-white/60">vs</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
              <div className="min-w-0">
                <p className="truncate text-xs text-white/75">{partner?.name ?? "Tu pareja"}</p>
                <p className="font-display text-lg leading-tight">
                  {duel.partnerBest !== null ? daily.format(duel.partnerBest) : "—"}
                </p>
              </div>
              <Avatar name={partner?.name ?? "?"} size="sm" tone={1} className="ring-2 ring-white/40" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm font-medium">
            <span className="text-white/90">
              {duelStatus === "me" && "Vas ganando el duelo de hoy"}
              {duelStatus === "partner" && "Te está ganando... remonta"}
              {duelStatus === "tie" && "Empate absoluto"}
              {duelStatus === "waiting" && "Esperando su marca"}
              {duelStatus === "pending" && "Hoy no te lo puedes perder"}
            </span>
            <span className="flex items-center gap-1 text-white/85 transition group-hover:gap-2">
              Jugar <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </section>
      </Link>

      {wonYesterdayUnclaimed && yesterdayDuel && (
        <DuelClaim gameName={yesterdayDuel.def.name} points={POINTS.duelWon} />
      )}

      {/* Temporada + racha */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Temporada {season.key}</CardTitle>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-plum text-white shadow-card">
              <LevelIcon className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="font-display text-xl text-ink">
                Nivel {season.level.index + 1} · {season.level.name}
              </p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose to-plum transition-all"
                  style={{
                    width: season.level.next
                      ? `${Math.min(100, Math.round(((season.total - season.level.min) / (season.level.next.min - season.level.min)) * 100))}%`
                      : "100%"
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {season.total} pts de pareja
                {season.level.next && ` · ${season.level.next.min - season.total} para ${season.level.next.name}`}
                {" · "}quedan {season.daysLeft} días
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-sand px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-ink">
              {myPoints >= partnerPoints && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              Tú: <b>{myPoints}</b>
            </span>
            <span className="flex items-center gap-1.5 text-ink">
              {partnerPoints > myPoints && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              {partner?.name ?? "Pareja"}: <b>{partnerPoints}</b>
            </span>
          </div>
        </Card>

        <Card>
          <CardTitle>Racha y duelos</CardTitle>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                streakInfo.streak > 0
                  ? "bg-orange-500/12 text-orange-500"
                  : "bg-sand text-ink-soft/50"
              )}
            >
              <Flame className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-xl text-ink">
                {streakInfo.streak} {streakInfo.streak === 1 ? "día" : "días"} de racha
              </p>
              <p className="text-xs text-ink-soft">
                {streakInfo.todayComplete
                  ? "Hoy ya está completo."
                  : "Se mantiene si ambos entráis hoy."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Últimos duelos
            </p>
            {history.every((day) => day.result === "none") ? (
              <p className="rounded-xl bg-sand px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
                Aquí quedará el marcador de cada reto del día: quién ganó, quién perdió y los
                empates. Jugad el de hoy para estrenarlo.
              </p>
            ) : (
            <div className="flex gap-1.5">
              {history.map((day) => (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-lg text-xs font-bold",
                      day.result === "me" &&
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                      day.result === "partner" && "bg-rose-soft text-rose-deep",
                      day.result === "tie" &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                      day.result === "none" && "bg-sand text-ink-soft/40"
                    )}
                  >
                    {day.result === "me" ? "G" : day.result === "partner" ? "P" : day.result === "tie" ? "E" : "·"}
                  </span>
                  <day.Icon className="h-3 w-3 text-ink-soft/60" />
                </div>
              ))}
            </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cara a cara: duelos 1v1 en vivo (lo que hace que Near se juegue juntos) */}
      <section className="mt-7">
        <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Cara a cara
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            en vivo
          </span>
        </h2>
        <p className="mb-3 text-xs text-ink-soft">
          Duelos por turnos en directo. Reta a {partner?.name ?? "tu pareja"} y jugad a la vez.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {liveDuels.map((duel) => (
            <Link key={duel.key} href={`/play/${duel.key}`} className="group">
              <Card className="relative h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
                <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80", duel.accent)} />
                <div className="flex items-start justify-between">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", duel.soft, duel.text)}>
                    <duel.Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    En vivo
                  </span>
                </div>
                <h3 className="mt-2.5 font-display text-lg text-ink">{duel.name}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{duel.tagline}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Sala de juegos */}
      <section className="mt-7">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Sala de juegos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {perGame.map(({ def, myBest, partnerBest, myAttempts }) => {
            const visual = gameVisual(def.key);
            const Icon = visual.icon;
            const attemptsLeft = def.maxAttemptsPerDay - myAttempts;
            return (
              <Link key={def.key} href={`/play/${def.key}`} className="group">
                <Card className="relative h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
                      visual.accent
                    )}
                  />
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        visual.accentSoft,
                        visual.accentText
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {def.key === daily.key ? (
                      <span className="rounded-full bg-rose-faint px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-deep">
                        Reto de hoy
                      </span>
                    ) : attemptsLeft === 0 ? (
                      <span className="flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        <Lock className="h-2.5 w-2.5" /> mañana
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2.5 font-display text-lg text-ink">{def.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{def.tagline}</p>
                  <p className="mt-2.5 text-xs text-ink-soft">
                    {myBest !== null ? (
                      <>
                        Tu hoy: <b className="text-ink">{def.format(myBest)}</b>
                      </>
                    ) : (
                      "Sin jugar hoy"
                    )}
                    {partnerBest !== null && (
                      <>
                        {" · "}
                        {partner?.name}: <b className="text-ink">{def.format(partnerBest)}</b>
                      </>
                    )}
                  </p>
                </Card>
              </Link>
            );
          })}
          <Link href="/play/quiz" className="group">
            <Card className="relative h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose to-plum opacity-80" />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose/12 text-rose-deep">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <h3 className="mt-2.5 font-display text-lg text-ink">Nos conocemos?</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                Responde y apuesta por lo que dira tu pareja. Cooperativo, sin cronometro.
              </p>
            </Card>
          </Link>
        </div>
      </section>

      {/* Logros */}
      <section className="mt-7">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Logros ({unlockedKeys.size}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = unlockedKeys.has(achievement.key);
            const Icon = achievementIcon(achievement.key);
            return (
              <div
                key={achievement.key}
                title={achievement.description}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition",
                  unlocked
                    ? "border-amber-300/50 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/20"
                    : "border-sand bg-paper opacity-50"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    unlocked ? "text-amber-600 dark:text-amber-400" : "text-ink-soft"
                  )}
                />
                <p className="text-[11px] font-medium leading-tight text-ink">{achievement.name}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
