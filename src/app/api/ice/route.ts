import { getCurrentUser } from "@/lib/couple";
import { cloudflareIceServers } from "@/lib/ice";

// Servidores ICE para la llamada: si hay claves de Cloudflare Realtime,
// credenciales TURN recién generadas; si no, null y el cliente usa su
// fallback estático (STUN + TURN de entorno si lo hay). Requiere sesión:
// generar credenciales TURN consume cuota.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const iceServers = await cloudflareIceServers();
  return Response.json({ iceServers });
}
