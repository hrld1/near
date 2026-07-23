// Clima y geocodificación con Open-Meteo (sin API key). Helpers de cliente,
// reutilizables por la ventana "Estar juntos" y el mapa de la distancia.

import type { LucideIcon } from "lucide-react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer } from "lucide-react";

export type Geo = { lat: number; lon: number; label: string };
export type Wx = { temp: number; code: number };

export async function geocode(city: string): Promise<Geo | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
    );
    const json = (await res.json()) as {
      results?: { latitude: number; longitude: number; name: string }[];
    };
    const r = json.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lon: r.longitude, label: r.name };
  } catch {
    return null;
  }
}

export async function currentWeather(lat: number, lon: number): Promise<Wx | null> {
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

// Código WMO → icono de trazo (lucide, coherente con el resto de la app) y
// etiqueta. it36: antes era emoji, que se veía distinto en cada sistema y no
// heredaba el color de Near. El icono se pinta con la tinta que lo rodee.
export function weatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 82) return CloudDrizzle;
  if (code <= 99) return CloudLightning;
  return Thermometer;
}

export function weatherLabel(code: number): string {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Poco nuboso";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Niebla";
  if (code <= 67) return "Lluvia";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chubascos";
  if (code <= 99) return "Tormenta";
  return "";
}
