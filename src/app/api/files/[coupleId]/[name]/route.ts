import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/couple";
import { getUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { coupleId: string; name: string } }
) {
  const user = await getCurrentUser();
  if (!user?.coupleId || user.coupleId !== params.coupleId) {
    return new NextResponse("No autorizado", { status: 403 });
  }
  // el backend (local o S3) es transparente: la URL y el control de acceso
  // por pareja no cambian
  const file = await getUpload(params.coupleId, params.name);
  if (!file) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=31536000, immutable"
    }
  });
}
