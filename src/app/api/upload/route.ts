import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/couple";
import { saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.coupleId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo no recibido" }, { status: 400 });
    }
    const url = await saveUpload(user.coupleId, file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
