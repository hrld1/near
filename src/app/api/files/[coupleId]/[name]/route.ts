import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/couple";
import { EXT_MIME, UPLOAD_ROOT } from "@/lib/uploads";

export const runtime = "nodejs";

const NAME_PATTERN = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

export async function GET(
  _req: Request,
  { params }: { params: { coupleId: string; name: string } }
) {
  const user = await getCurrentUser();
  if (!user?.coupleId || user.coupleId !== params.coupleId) {
    return new NextResponse("No autorizado", { status: 403 });
  }
  if (!NAME_PATTERN.test(params.name)) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  try {
    const filePath = path.join(UPLOAD_ROOT, params.coupleId, params.name);
    const data = await readFile(filePath);
    const ext = params.name.split(".").pop() ?? "";
    return new NextResponse(data, {
      headers: {
        "Content-Type": EXT_MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
