import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/couple";
import { spotifyEnabled, spotifyAuthUrl } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Inicia el OAuth de Spotify. Dormido sin claves de entorno.
export async function GET(req: Request) {
  if (!spotifyEnabled()) {
    return NextResponse.json({ error: "Spotify no está configurado" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const state = globalThis.crypto.randomUUID();
  cookies().set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  });

  const redirectUri = new URL("/api/spotify/callback", req.url).toString();
  return NextResponse.redirect(spotifyAuthUrl(redirectUri, state));
}
