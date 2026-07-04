import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "video/webm": "webm"
};

export const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg"
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function saveUpload(coupleId: string, file: File): Promise<string> {
  const baseMime = file.type.split(";")[0];
  const ext = MIME_EXT[baseMime];
  if (!ext) throw new Error("Tipo de archivo no permitido");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Archivo demasiado grande (max 8MB)");
  const dir = path.join(UPLOAD_ROOT, coupleId);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/api/files/${coupleId}/${name}`;
}
