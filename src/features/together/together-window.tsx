"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { skyForHour } from "@/lib/sky";
import { currentWeather, geocode, weatherText, type Wx } from "@/lib/weather";
import { effectivePresence } from "@/lib/presence";
import { presenceInfo, moodInfo } from "@/lib/utils";
import { PartnerOnline } from "@/features/presence/partner-online";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { MemberInfo } from "@/types";

// La ventana a su mundo: un cielo que respira con la hora de tu pareja, su
// presencia, su ánimo y su clima. Pensada para dejarla abierta. Pasiva: no
// tienes que hacer nada para sentir que está ahí.

function hourDecimal(tz: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h + m / 60;
  } catch {
    return 12;
  }
}

function timeIn(tz: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("es", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz
    }).format(now);
  } catch {
    return "--:--";
  }
}

// estrellas deterministas: mismas posiciones en cada render
const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: (i * 97.13) % 100,
  y: (i * 43.77) % 62,
  r: 0.5 + ((i * 7) % 3) * 0.4,
  delay: (i % 6) * 0.5
}));

export function TogetherWindow({
  partner,
  myTimezone,
  partnerTimezone,
  partnerCity,
  partnerLat,
  partnerLon,
  partnerPresence,
  partnerPresenceUpdatedAt,
  partnerMood,
  partnerMoodNote,
  initialOnline
}: {
  partner: MemberInfo | null;
  myTimezone: string;
  partnerTimezone: string;
  partnerCity: string | null;
  partnerLat: number | null;
  partnerLon: number | null;
  partnerPresence: string;
  partnerPresenceUpdatedAt: string | null;
  partnerMood: string | null;
  partnerMoodNote: string | null;
  initialOnline: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const [wx, setWx] = useState<Wx | null>(null);
  const wxDone = useRef(false);

  // el cielo se recalcula solo con el tiempo: tic cada 30s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // clima de su ciudad, una vez
  useEffect(() => {
    if (wxDone.current) return;
    wxDone.current = true;
    void (async () => {
      let lat = partnerLat;
      let lon = partnerLon;
      if ((lat == null || lon == null) && partnerCity) {
        const g = await geocode(partnerCity);
        if (g) {
          lat = g.lat;
          lon = g.lon;
        }
      }
      if (lat != null && lon != null) setWx(await currentWeather(lat, lon));
    })();
  }, [partnerCity, partnerLat, partnerLon]);

  const sky = useMemo(() => skyForHour(hourDecimal(partnerTimezone, now)), [partnerTimezone, now]);
  const theirTime = timeIn(partnerTimezone, now);
  const myTime = timeIn(myTimezone, now);
  const partnerName = partner?.name ?? "tu pareja";

  const effective = partner ? effectivePresence(partnerPresence, partnerPresenceUpdatedAt ? new Date(partnerPresenceUpdatedAt) : null, now) : "NONE";
  const presence = effective !== "NONE" ? presenceInfo(effective) : null;
  const mood = partnerMood ? moodInfo(partnerMood) : null;

  const bodyLeft = `${10 + sky.bodyX * 80}%`;
  const bodyTop = `${8 + (1 - sky.bodyY) * 52}%`;

  return (
    <div
      className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center overflow-hidden px-6 py-10 text-white md:min-h-dvh"
      style={{
        background: `linear-gradient(to bottom, ${sky.gradient[0]}, ${sky.gradient[1]} 55%, ${sky.gradient[2]})`
      }}
    >
      {/* estrellas */}
      {sky.stars &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="pointer-events-none absolute rounded-full bg-white motion-safe:animate-pulse"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r * 2,
              height: s.r * 2,
              opacity: 0.7,
              animationDelay: `${s.delay}s`,
              animationDuration: "3.5s"
            }}
          />
        ))}

      {/* sol o luna */}
      <span
        className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: bodyLeft,
          top: bodyTop,
          background:
            sky.body === "sun"
              ? "radial-gradient(circle, #fff7d6, #ffd873 55%, rgba(255,200,80,0.25) 72%, transparent 78%)"
              : "radial-gradient(circle, #eef1f7, #cbd3e6 60%, rgba(200,210,235,0.2) 72%, transparent 80%)",
          boxShadow:
            sky.body === "sun"
              ? "0 0 70px 26px rgba(255,214,110,0.45)"
              : "0 0 40px 12px rgba(210,220,245,0.28)"
        }}
      />

      {/* contenido: la otra persona */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {partner ? (
          <>
            <span className="relative">
              <span className="absolute inset-0 rounded-full bg-white/20 blur-md motion-safe:animate-ping" style={{ animationDuration: "3s" }} />
              <Avatar name={partner.name} tone={1} size="lg" className="relative h-24 w-24 text-3xl ring-2 ring-white/30" />
            </span>

            <p className="mt-5 text-sm text-white/70">
              {partnerCity ? `En ${partnerCity}, ` : ""}
              {sky.label}
            </p>
            <p className="mt-1 font-display text-6xl tabular-nums text-white drop-shadow sm:text-7xl">
              {theirTime}
            </p>
            <p className="mt-1 text-lg font-display text-white/90">{partnerName}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
              <PartnerOnline partnerId={partner.id} initialOnline={initialOnline} className="text-emerald-300" />
              {presence && (
                <span className="inline-flex items-center gap-1.5 text-white/80">
                  <span className={cn("h-2 w-2 rounded-full", presence.dot)} />
                  {presence.label}
                </span>
              )}
              {wx && <span className="text-white/80">{weatherText(wx.code)} {wx.temp}°</span>}
            </div>

            {mood && (
              <p className="mt-4 max-w-xs text-sm text-white/85">
                <span className="mr-1.5 text-base">{mood.emoji}</span>
                Hoy se siente {mood.label.toLowerCase()}
                {partnerMoodNote && <span className="text-white/60"> — “{partnerMoodNote}”</span>}
              </p>
            )}

            {!partnerCity && (
              <p className="mt-5 flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white/70">
                <MapPin className="h-3.5 w-3.5" />
                Pídele que añada su ciudad para ver su cielo real
              </p>
            )}
          </>
        ) : (
          <p className="text-white/70">Aún no hay nadie vinculado.</p>
        )}
      </div>

      {/* tu hora, discreta abajo */}
      <p className="absolute bottom-6 z-10 text-xs text-white/45">
        Aquí son las {myTime}
      </p>
    </div>
  );
}
