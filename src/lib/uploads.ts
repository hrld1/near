import { randomUUID } from "crypto";
import { getStorage } from "@/lib/storage";

export { UPLOAD_ROOT, storageMode } from "@/lib/storage";

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

// Nombre de archivo servido: <uuid>.<ext>. Se valida al leer para no permitir
// rutas arbitrarias.
const NAME_PATTERN = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

// Guarda un archivo (local o S3, según entorno) y devuelve su URL /api/files/...
// La URL es estable e independiente del backend de almacenamiento.
export async function saveUpload(coupleId: string, file: File): Promise<string> {
  const baseMime = file.type.split(";")[0];
  const ext = MIME_EXT[baseMime];
  if (!ext) throw new Error("Tipo de archivo no permitido");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Archivo demasiado grande (max 8MB)");
  const name = `${randomUUID()}.${ext}`;
  const key = `${coupleId}/${name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await getStorage().put(key, buffer, baseMime);
  return `/api/files/${coupleId}/${name}`;
}

// Lee un archivo por pareja+nombre. Devuelve bytes y content-type (inferido de
// la extensión, igual en local y S3), o null si no existe o el nombre no vale.
export async function getUpload(
  coupleId: string,
  name: string
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!NAME_PATTERN.test(name)) return null;
  const body = await getStorage().get(`${coupleId}/${name}`);
  if (!body) return null;
  const ext = name.split(".").pop() ?? "";
  return { body, contentType: EXT_MIME[ext] ?? "application/octet-stream" };
}
