"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { claimDuelWinAction } from "@/actions/games";
import { Button } from "@/components/ui/button";

// Card "ganaste el duelo de ayer": solo se monta si hay victoria sin cobrar.
export function DuelClaim({ gameName, points }: { gameName: string; points: number }) {
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimDuelWinAction();
      if (result.ok) setClaimed(true);
      else setError(result.error);
    });
  }

  if (claimed) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <Trophy className="h-4 w-4" /> +{points} puntos por el duelo de ayer. Campeon/a.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/20">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <Trophy className="h-4 w-4" />
        Ganaste el duelo de ayer ({gameName})
      </p>
      <Button size="sm" onClick={claim} loading={pending}>
        Reclamar +{points}
      </Button>
      {error && <p className="w-full text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
