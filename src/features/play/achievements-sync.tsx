"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncAchievementsAction } from "@/actions/games";

// Dispara el recalculo de logros al entrar en /play y refresca solo si hay
// desbloqueos nuevos. El guard de ref evita el doble efecto de StrictMode.
export function AchievementsSync() {
  const ran = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void syncAchievementsAction().then((result) => {
      if (result.ok && result.data && result.data.fresh.length > 0) router.refresh();
    });
  }, [router]);

  return null;
}
