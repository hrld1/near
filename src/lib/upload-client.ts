"use client";

export async function uploadFile(file: File | Blob, name: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, name);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Error al subir el archivo");
  return json.url;
}
