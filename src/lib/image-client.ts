"use client";

// Compresion real en cliente antes de subir: reescala a max 1600px y
// re-codifica a JPEG (o mantiene el original si ya es mas pequeño).
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (file.type === "image/gif") return { blob: file, name: file.name }; // no romper gifs
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, name: file.name };
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (blob && blob.size < file.size) {
      return { blob, name: file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg" };
    }
    return { blob: file, name: file.name };
  } catch {
    return { blob: file, name: file.name };
  }
}
