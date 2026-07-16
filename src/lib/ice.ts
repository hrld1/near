// Servidores ICE para la videollamada (it31). STUN público siempre; TURN de
// Cloudflare Realtime si el entorno trae CF_TURN_KEY_ID + CF_TURN_API_TOKEN —
// dormido sin claves, como todos los adaptadores. Las credenciales de
// Cloudflare CADUCAN (se generan por API con un TTL), así que se piden en
// servidor y se cachean hasta la mitad de su vida; el cliente las recoge de
// /api/ice justo antes de crear la RTCPeerConnection.

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const TTL_SECONDS = 4 * 3600;

export function turnEnabled(): boolean {
  return !!(process.env.CF_TURN_KEY_ID && process.env.CF_TURN_API_TOKEN);
}

// La API de Cloudflare ha devuelto históricamente iceServers como objeto único
// y como lista según la versión del endpoint; toleramos ambas formas (y basura).
export function normalizeIceServers(payload: unknown): IceServer[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { iceServers?: unknown }).iceServers ?? payload;
  const list = Array.isArray(raw) ? raw : [raw];
  const out: IceServer[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { urls, username, credential } = item as Record<string, unknown>;
    const urlsOk =
      typeof urls === "string" ||
      (Array.isArray(urls) && urls.length > 0 && urls.every((u) => typeof u === "string"));
    if (!urlsOk) continue;
    out.push({
      urls: urls as string | string[],
      ...(typeof username === "string" ? { username } : {}),
      ...(typeof credential === "string" ? { credential } : {})
    });
  }
  return out;
}

let cache: { servers: IceServer[]; freshUntil: number } | null = null;

export async function cloudflareIceServers(): Promise<IceServer[] | null> {
  if (!turnEnabled()) return null;
  if (cache && Date.now() < cache.freshUntil) return cache.servers;
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CF_TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_TURN_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
        cache: "no-store"
      }
    );
    // ante cualquier fallo devolvemos lo último bueno (o null): la llamada
    // nunca debe romperse por el TURN — el cliente tiene su fallback STUN
    if (!res.ok) return cache?.servers ?? null;
    const servers = normalizeIceServers(await res.json());
    if (servers.length === 0) return cache?.servers ?? null;
    cache = { servers, freshUntil: Date.now() + (TTL_SECONDS / 2) * 1000 };
    return servers;
  } catch {
    return cache?.servers ?? null;
  }
}
