import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Crown,
  Flame,
  HeartHandshake,
  Lock,
  Swords
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { todayKey } from "@/lib/utils";
import { GAMES, gameOfDay, compareScores } from "@/lib/games";
import {
  ACHIEVEMENTS,
  getCoupleStreak,
  getSeason,
  syncAchievements
} from "@/lib/engagement";
import { gameVisual, levelIcon, achievementIcon } from "@/components/product-icons";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/live-refresh";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arcade" };
export const dynamic = "force-dynamic";

function bestOf(scores: number[], lowerIsBetter: boolean): number | null {
  if (scores.length === 0) return null;
  return lowerIsBetter ? Math.min(...scores) : Math.max(...scores);
}

function shiftKey(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function PlayPage() {
  const { user, couple, partner } = await requireCouple();
  const dateKey = todayKey();
  const daily = gameOfDay(dateKey);
  const weekKeys = Array.from({ length: 7 }, (_, i) => shiftKey(i)).reverse();

  const [todayScores, weekScores, season, streakInfo, achievementInfo] = await Promise.all([
    prisma.gameScore.findMany({ where: { coupleId: couple.id, dateKey } }),
    prisma.gameScore.findMany({ where: { coupleId: couple.id, dateKey: { in: weekKeys } } }),
    getSeason(couple.id),
    getCoupleStreak(couple.id, couple.members.map((m) => m.id)),
    syncAchievements(couple.id, user.id, couple.members.map((m) => m.id))
  ]);

  const perGame = GAMES.map((def) => {
    const mine = todayScores.filter((s) => s.gameKey === def.key && s.userId === user.id);
    const theirs = partner
      ? todayScores.filter((s) => s.gameKey === def.key && s.userId === partner.id)
      : [];
    return {
      def,
      myBest: bestOf(mine.map((s) => s.score), def.lowerIsBetter),
      partnerBest: bestOf(theirs.map((s) => s.score), def.lowerIsBetter),
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
      weekScores.filter((s) => s.dateKey === key && s.gameKey === def.key && s.userId === user.id).map((s) => s.score),
      def.lowerIsBetter
    );
    const theirs = partner
      ? bestOf(
          weekScores.filter((s) => s.dateKey === key && s.gameKey === def.key && s.userId === partner.id).map((s) => s.score),
          def.lowerIsBetter
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
  const unlockedKeys = new Set(achievementInfo.unlocked.map((u) => u.key));
  const DailyVisual = gameVisual(daily.key);
  const DailyIcon = DailyVisual.icon;
  const LevelIcon = levelIcon(season.level.index);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <LiveRefresh types={["game:score", "season"]} />
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Arcade</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Un reto nuevo cada dia. Los numeros deciden quien manda esta semana.
        </p>
      </header>

      {/* Reto del dia: duelo VS */}
      <Link href={`/play/${daily.key}`} className="group block">
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lift transition group-hover:shadow-xl md:p-7",
            DailyVisual.accent
          )}
        >
          <DailyIcon className="absolute -right-6 -top-6 h-40 w-40 opacity-15 transition duration-500 group-hover:rotate-12 group-hover:scale-110" />
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/85">
            <Swords className="h-4 w-4" /> Reto del dia
          </p>
          <h2 className="mt-1 font-display text-3xl">{daily.name}</h2>
          <p className="mt-0.5 max-w-sm text-sm text-white/85">{daily.tagline}</p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-sm sm:gap-5 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar name={user.name} size="sm" className="ring-2 ring-white/40" />
              <div className="min-w-0">
                <p className="truncate text-xs text-white/75">Tu</p>
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
              {duelStatus === "partner" && "Te esta ganando... remonta"}
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
                {" · "}quedan {season.daysLeft} dias
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-sand px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-ink">
              {myPoints >= partnerPoints && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              Tu: <b>{myPoints}</b>
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
                {streakInfo.streak} {streakInfo.streak === 1 ? "dia" : "dias"} de racha
              </p>
              <p className="text-xs text-ink-soft">
                {streakInfo.todayComplete
                  ? "Hoy ya esta completo."
                  : "Se mantiene si ambos entrais hoy."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Ultimos duelos
            </p>
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
          </div>
        </Card>
      </div>

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
                      <span className="rounded-full bg-rose-faint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-deep">
                        Reto de hoy
                      </span>
                    ) : attemptsLeft === 0 ? (
                      <span className="flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                        <Lock className="h-2.5 w-2.5" /> manana
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
          {achievementInfo.fresh.length > 0 && " · hay nuevos"}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = unlockedKeys.has(achievement.key);
            const fresh = achievementInfo.fresh.includes(achievement.key);
            const Icon = achievementIcon(achievement.key);
            return (
              <div
                key={achievement.key}
                title={achievement.description}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition",
                  unlocked
                    ? "border-amber-300/50 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/20"
                    : "border-sand bg-paper opacity-50",
                  fresh && "animate-pop-in ring-2 ring-amber-400"
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
