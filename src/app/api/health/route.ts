import { prisma } from "@/lib/db";

// Salud de la instancia: ¿responde el proceso y llega a la base de datos?
// Público a propósito (uptime checks); no revela nada sensible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
  return Response.json({
    ok: true,
    db: "up",
    version: process.env.APP_VERSION ?? "dev",
    uptimeSec: Math.round((Date.now() - startedAt) / 1000)
  });
}
