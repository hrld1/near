"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Check, ChevronRight, Flame, Gift } from "lucide-react";
import { claimMissionBonusAction, claimWeeklyBonusAction } from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/features/play/confetti";
import { cn } from "@/lib/utils";
import type { Mission } from "@/lib/engagement";

export type WeeklyBonusInfo = {
  claimable: boolean;
  claimed: boolean;
  thisWeekDaysComplete: number;
  points: number;
};

export function StreakMissions({
  streak,
  todayComplete,
  graceDay = null,
  missions,
  allDone,
  bonusClaimed,
  bonusPoints,
  weekly
}: {
  streak: number;
  todayComplete: boolean;
  // día perdonado más reciente (el "perdón" de la racha), si lo hubo
  graceDay?: string | null;
  missions: Mission[];
  allDone: boolean;
  bonusClaimed: boolean;
  bonusPoints: number;
  weekly?: WeeklyBonusInfo | null;
}) {
  const [claimed, setClaimed] = useState(bonusClaimed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [weeklyClaimed, setWeeklyClaimed] = useState(weekly?.claimed ?? false);
  const [weeklyPending, startWeeklyTransition] = useTransition();
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  // Distinto de `claimed`/`weeklyClaimed`: esos arrancan en true si ya se
  // reclamó antes de cargar la página, y no queremos confeti en cada visita.
  // Este solo se enciende con el clic de AHORA.
  const [celebrate, setCelebrate] = useState(false);

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimMissionBonusAction();
      if (result.ok) {
        setClaimed(true);
        setCelebrate(true);
      } else setError(result.error);
    });
  }

  function claimWeekly() {
    setWeeklyError(null);
    startWeeklyTransition(async () => {
      const result = await claimWeeklyBonusAction();
      if (result.ok) {
        setWeeklyClaimed(true);
        setCelebrate(true);
      } else setWeeklyError(result.error);
    });
  }

  return (
    <div className="relative">
      {celebrate && <Confetti />}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            streak > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-sand"
          )}
        >
          <Flame className={cn("h-6 w-6", streak > 0 ? "text-orange-500" : "text-ink-soft/50")} />
        </span>
        <div>
          <p className="font-display text-2xl leading-none text-ink">
            {streak} {streak === 1 ? "día" : "días"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {todayComplete
              ? "Racha asegurada hoy. Equipazo."
              : streak > 0
                ? "Entrad ambos hoy para no perderla."
                : "La racha empieza cuando ambos entráis el mismo día."}
          </p>
        </div>
      </div>

      {graceDay && (
        <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          Un día flojo no os la quitó: os guardamos la racha 💛 (un perdón cada 30 días)
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {missions.map((mission) => (
          <li key={mission.id}>
            <Link
              href={mission.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition",
                mission.done
                  ? "border-emerald-200/60 bg-emerald-50/60 text-ink dark:border-emerald-800/40 dark:bg-emerald-900/15"
                  : "border-sand bg-paper text-ink hover:bg-sand"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  mission.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-sand-deep"
                )}
              >
                {mission.done && <Check className="h-3 w-3" />}
              </span>
              <span className={cn("flex-1", mission.done && "line-through opacity-60")}>
                {mission.label}
              </span>
              <span className="text-xs font-semibold text-rose-deep">+{mission.points}</span>
              {!mission.done && <ChevronRight className="h-3.5 w-3.5 text-ink-soft" />}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        {claimed ? (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Gift className="h-4 w-4" /> Bonus de +{bonusPoints} reclamado. Mañana, mas.
          </p>
        ) : (
          <Button
            size="sm"
            className="w-full"
            variant={allDone ? "primary" : "secondary"}
            disabled={!allDone}
            loading={pending}
            onClick={claim}
          >
            <Gift className="h-4 w-4" />
            {allDone ? `Reclamar bonus +${bonusPoints}` : "Completa las 3 misiones para el bonus"}
          </Button>
        )}
        {error && <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>

      {weekly && (
        <div className="mt-2">
          {weekly.claimable && !weeklyClaimed ? (
            <Button size="sm" variant="secondary" className="w-full" loading={weeklyPending} onClick={claimWeekly}>
              <CalendarCheck className="h-4 w-4" />
              Semana pasada perfecta: reclamar +{weekly.points}
            </Button>
          ) : weeklyClaimed ? (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <CalendarCheck className="h-4 w-4" /> Bonus semanal de +{weekly.points} reclamado.
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-xs text-ink-soft">
              <CalendarCheck className="h-3.5 w-3.5" />
              Semana en curso: {weekly.thisWeekDaysComplete}/7 días completos (7/7 = +{weekly.points})
            </p>
          )}
          {weeklyError && (
            <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">{weeklyError}</p>
          )}
        </div>
      )}
    </div>
  );
}
