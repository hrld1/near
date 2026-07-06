"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { setCityAction } from "@/actions/presence";

type Geo = { lat: number; lon: number; label: string };
type Wx = { temp: number; code: number };

// Descripción WMO compacta (Open-Meteo). Sin assets: emoji.
function weatherText(code: number): string {
  if (code === 0) return "☀️ Despejado";
  if (code <= 2) return "🌤️ Poco nuboso";
  if (code === 3) return "☁️ Nublado";
  if (code <= 48) return "🌫️ Niebla";
  if (code <= 67) return "🌧️ Lluvia";
  if (code <= 77) return "🌨️ Nieve";
  if (code <= 82) return "🌦️ Chubascos";
  if (code <= 99) return "⛈️ Tormenta";
  return "🌡️";
}

async function geocode(city: string): Promise<Geo | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
    );
    const json = (await res.json()) as {
      results?: { latitude: number; longitude: number; name: string; country_code?: string }[];
    };
    const r = json.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lon: r.longitude, label: r.name };
  } catch {
    return null;
  }
}

async function weather(lat: number, lon: number): Promise<Wx | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    );
    const json = (await res.json()) as {
      current?: { temperature_2m: number; weather_code: number };
    };
    if (!json.current) return null;
    return { temp: Math.round(json.current.temperature_2m), code: json.current.weather_code };
  } catch {
    return null;
  }
}

function haversineKm(a: Geo, b: Geo): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function DistanceMap({
  myName,
  partnerName,
  myCity,
  partnerCity,
  nextMeeting
}: {
  myName: string;
  partnerName: string;
  myCity: string | null;
  partnerCity: string | null;
  nextMeeting: { title: string; startsAt: string } | null;
}) {
  const router = useRouter();
  const [cityInput, setCityInput] = useState(myCity ?? "");
  const [pending, startTransition] = useTransition();
  const [mine, setMine] = useState<Geo | null>(null);
  const [theirs, setTheirs] = useState<Geo | null>(null);
  const [myWx, setMyWx] = useState<Wx | null>(null);
  const [theirWx, setTheirWx] = useState<Wx | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void (async () => {
      const [g1, g2] = await Promise.all([
        myCity ? geocode(myCity) : Promise.resolve(null),
        partnerCity ? geocode(partnerCity) : Promise.resolve(null)
      ]);
      setMine(g1);
      setTheirs(g2);
      if (g1) void weather(g1.lat, g1.lon).then(setMyWx);
      if (g2) void weather(g2.lat, g2.lon).then(setTheirWx);
    })();
  }, [myCity, partnerCity]);

  const km = mine && theirs ? haversineKm(mine, theirs) : null;
  const daysToMeeting = nextMeeting
    ? Math.max(0, Math.ceil((new Date(nextMeeting.startsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  function saveCity() {
    const value = cityInput.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await setCityAction(value);
      if (result.ok) {
        done.current = false;
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-rose/15 shadow-card">
        {/* lienzo de la distancia: dos puntos y un arco */}
        <svg viewBox="0 0 400 220" className="w-full" style={{ background: "linear-gradient(160deg,#141a2e,#2a1830)" }}>
          {[...Array(40)].map((_, i) => (
            <circle
              key={i}
              cx={(i * 97) % 400}
              cy={(i * 53) % 220}
              r={0.7}
              fill="rgba(255,255,255,0.35)"
            />
          ))}
          <path d="M 60 150 Q 200 40 340 150" fill="none" stroke="rgba(244,114,182,0.7)" strokeWidth="2" strokeDasharray="5 5" />
          {/* punto mío */}
          <circle cx="60" cy="150" r="7" fill="#f472b6" />
          <circle cx="60" cy="150" r="13" fill="none" stroke="rgba(244,114,182,0.4)" strokeWidth="2" />
          <text x="60" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
            {mine?.label ?? myCity ?? myName}
          </text>
          {/* punto pareja */}
          <circle cx="340" cy="150" r="7" fill="#fbbf24" />
          <circle cx="340" cy="150" r="13" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="2" />
          <text x="340" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
            {theirs?.label ?? partnerCity ?? partnerName}
          </text>
          {km !== null && (
            <text x="200" y="30" textAnchor="middle" fill="white" fontSize="15" fontWeight="700">
              {km.toLocaleString("es")} km
            </text>
          )}
        </svg>

        <div className="grid grid-cols-2 gap-px bg-sand/50">
          <div className="bg-paper p-3 text-center">
            <p className="text-xs font-medium text-ink-soft">{mine?.label ?? myName}</p>
            <p className="mt-0.5 text-sm text-ink">{myWx ? `${weatherText(myWx.code)} ${myWx.temp}°` : "—"}</p>
          </div>
          <div className="bg-paper p-3 text-center">
            <p className="text-xs font-medium text-ink-soft">{theirs?.label ?? partnerName}</p>
            <p className="mt-0.5 text-sm text-ink">{theirWx ? `${weatherText(theirWx.code)} ${theirWx.temp}°` : "—"}</p>
          </div>
        </div>
      </div>

      {km !== null && (
        <p className="text-center text-sm text-ink-soft">
          {daysToMeeting !== null
            ? daysToMeeting === 0
              ? `Hoy os veis: ${nextMeeting?.title} 💞`
              : `${nextMeeting?.title} en ${daysToMeeting} ${daysToMeeting === 1 ? "día" : "días"} — cada día, un poco más cerca.`
            : "Marcad una fecha para veros y la distancia pesará menos."}
        </p>
      )}

      {/* añadir / cambiar mi ciudad */}
      <div className="flex items-center gap-2 rounded-2xl border border-sand bg-paper p-3 shadow-card">
        <MapPin className="h-4 w-4 shrink-0 text-rose" />
        <input
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveCity()}
          placeholder="Tu ciudad (p. ej. Valencia)"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none"
        />
        <button
          onClick={saveCity}
          disabled={pending || !cityInput.trim()}
          className="shrink-0 rounded-lg bg-rose px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-deep disabled:opacity-50"
        >
          {myCity ? "Cambiar" : "Guardar"}
        </button>
      </div>
      {!partnerCity && (
        <p className="text-center text-xs text-ink-soft">
          Pídele a {partnerName} que añada su ciudad para ver la distancia.
        </p>
      )}
    </div>
  );
}
