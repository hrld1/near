"use client";

import { useEffect, useState } from "react";

// Reloj local de tu pareja: usa su User.timezone (IANA).
export function PartnerClock({ timezone, name }: { timezone: string; name: string }) {
  const [time, setTime] = useState<string | null>(null);
  const [dayDiff, setDayDiff] = useState<string>("");

  useEffect(() => {
    function tick() {
      try {
        const now = new Date();
        setTime(
          new Intl.DateTimeFormat("es", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone
          }).format(now)
        );
        const theirDay = new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          day: "numeric"
        }).format(now);
        const myDay = new Intl.DateTimeFormat("en-CA", { day: "numeric" }).format(now);
        setDayDiff(theirDay === myDay ? "" : " (otro dia)");
      } catch {
        setTime(null);
      }
    }
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, [timezone]);

  if (!time) return null;
  return (
    <span className="text-xs text-ink-soft" title={`Zona horaria de ${name}: ${timezone}`}>
      🕐 Alli son las {time}
      {dayDiff}
    </span>
  );
}
