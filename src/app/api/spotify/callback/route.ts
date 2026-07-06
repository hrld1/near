import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/couple";
import { spotifyEnabled, exchangeCode, saveAccount } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Vuelta del OAuth de Spotify: valida el state, canjea el code por tokens,
// lee el perfil y guarda la cuenta. Redirige de vuelta a la sala.
export async function GET(req: Request) {
  const back = new URL("/date-room", req.url);
  if (!spotifyEnabled()) return NextResponse.redirect(back);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = cookies().get("spotify_oauth_state")?.value;
  cookies().delete("spotify_oauth_state");

  if (!code || !state || state !== saved) {
    back.searchParams.set("spotify", "error");
    return NextResponse.redirect(back);
  }

  const redirectUri = new URL("/api/spotify/callback", req.url).toString();
  const tokens = await exchangeCode(code, redirectUri);
  if (!tokens || !tokens.refresh_token) {
    back.searchParams.set("spotify", "error");
    return NextResponse.redirect(back);
  }

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store"
  });
  const profile = meRes.ok
    ? ((await meRes.json()) as { id: string; product?: string })
    : { id: "unknown" };

  await saveAccount(user.id, tokens, { id: profile.id, product: profile.product });
  back.searchParams.set("spotify", "connected");
  return NextResponse.redirect(back);
}
