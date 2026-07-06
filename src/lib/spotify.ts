import { prisma } from "@/lib/db";

// Integracion real con Spotify Connect, ENCENDIDA SOLO por entorno: si no hay
// SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET, todo esto queda dormido y la sala
// mantiene el modo companion honesto. Sin claves, la app funciona igual.
//
// Flujo: OAuth (Authorization Code) -> tokens por usuario (SpotifyAccount) ->
// el "lider" comparte su reproduccion actual por el bus (music:sync) y el
// "seguidor", si tiene su cuenta conectada y Spotify Premium con un
// dispositivo activo, la reproduce en su lado.

const AUTH_BASE = "https://accounts.spotify.com";
const API_BASE = "https://api.spotify.com/v1";
const SCOPES = "user-read-playback-state user-modify-playback-state user-read-currently-playing";

export function spotifyEnabled() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function spotifyAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

function basicAuth() {
  const raw = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return "Basic " + Buffer.from(raw).toString("base64");
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse | null> {
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    cache: "no-store"
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store"
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

export async function saveAccount(
  userId: string,
  tokens: TokenResponse,
  profile: { id: string; product?: string | null }
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const refreshToken = tokens.refresh_token;
  await prisma.spotifyAccount.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token,
      expiresAt,
      spotifyId: profile.id,
      product: profile.product ?? null,
      ...(refreshToken ? { refreshToken } : {})
    },
    create: {
      userId,
      spotifyId: profile.id,
      product: profile.product ?? null,
      accessToken: tokens.access_token,
      refreshToken: refreshToken ?? "",
      expiresAt
    }
  });
}

// Devuelve un access token vigente (refresca si esta a punto de caducar) o null
// si el usuario no tiene cuenta conectada.
async function getFreshAccessToken(userId: string): Promise<string | null> {
  const acc = await prisma.spotifyAccount.findUnique({ where: { userId } });
  if (!acc) return null;
  if (acc.expiresAt.getTime() > Date.now() + 30_000) return acc.accessToken;
  const refreshed = await refreshTokens(acc.refreshToken);
  if (!refreshed) return null;
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await prisma.spotifyAccount.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      expiresAt,
      ...(refreshed.refresh_token ? { refreshToken: refreshed.refresh_token } : {})
    }
  });
  return refreshed.access_token;
}

export type Playback = {
  trackUri: string | null;
  trackName: string | null;
  artists: string | null;
  albumArt: string | null;
  positionMs: number;
  playing: boolean;
};

export async function getCurrentPlayback(userId: string): Promise<Playback | null> {
  const token = await getFreshAccessToken(userId);
  if (!token) return null;
  const res = await fetch(`${API_BASE}/me/player`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  // 204 = no hay nada sonando ahora mismo
  if (res.status === 204) {
    return { trackUri: null, trackName: null, artists: null, albumArt: null, positionMs: 0, playing: false };
  }
  if (!res.ok) return null;
  const data = (await res.json()) as {
    is_playing?: boolean;
    progress_ms?: number;
    item?: {
      uri?: string;
      name?: string;
      artists?: { name: string }[];
      album?: { images?: { url: string }[] };
    };
  };
  const item = data.item;
  return {
    trackUri: item?.uri ?? null,
    trackName: item?.name ?? null,
    artists: item?.artists?.map((a) => a.name).join(", ") ?? null,
    albumArt: item?.album?.images?.[0]?.url ?? null,
    positionMs: data.progress_ms ?? 0,
    playing: Boolean(data.is_playing)
  };
}

// Reproduce un tema en el dispositivo activo del usuario (necesita Premium).
export async function playTrack(userId: string, trackUri: string, positionMs: number): Promise<boolean> {
  const token = await getFreshAccessToken(userId);
  if (!token) return false;
  const res = await fetch(`${API_BASE}/me/player/play`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [trackUri], position_ms: positionMs }),
    cache: "no-store"
  });
  return res.ok || res.status === 204;
}

export async function isSpotifyConnected(userId: string): Promise<boolean> {
  const acc = await prisma.spotifyAccount.findUnique({
    where: { userId },
    select: { userId: true }
  });
  return Boolean(acc);
}
