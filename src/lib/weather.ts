// Clima y geocodificación con Open-Meteo (sin API key). Helpers de cliente,
// reutilizables por la ventana "Estar juntos" y el mapa de la distancia.

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

// Código WMO → emoji (sin assets).
export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

export function weatherText(code: number): string {
  const labels: Record<string, string> = {
    "☀️": "Despejado",
    "🌤️": "Poco nuboso",
    "☁️": "Nublado",
    "🌫️": "Niebla",
    "🌧️": "Lluvia",
    "🌨️": "Nieve",
    "🌦️": "Chubascos",
    "⛈️": "Tormenta"
  };
  const emoji = weatherEmoji(code);
  return labels[emoji] ? `${emoji} ${labels[emoji]}` : emoji;
}
