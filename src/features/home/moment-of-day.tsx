"use client";

import { useRef, useState } from "react";
import { Camera, Flame, ImagePlus, Lock, Sparkles } from "lucide-react";
import { setDailyPhotoAction } from "@/actions/photo";
import { uploadFile } from "@/lib/upload-client";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Photo = { imageUrl: string; caption: string | null };

// "El momento de hoy": el ritual diario recíproco, corazón de Hoy. Ambos
// respondéis al MISMO tema; ves el momento de tu pareja SOLO después de
// compartir el tuyo (esa reciprocidad es el gancho). Racha de días seguidos
// en que los dos lo hacéis. Reutiliza la foto del día (modelo, acción, push).
export function MomentOfDay({
  myId,
  theme,
  partnerName,
  streak,
  initialMyPhoto,
  initialPartnerPhoto,
  partnerPostedInitial
}: {
  myId: string;
  theme: string;
  partnerName: string;
  streak: number;
  initialMyPhoto: Photo | null;
  // solo llega con contenido si YA está revelado (ya compartí el mío)
  initialPartnerPhoto: Photo | null;
  partnerPostedInitial: boolean;
}) {
  const [myPhoto, setMyPhoto] = useState<Photo | null>(initialMyPhoto);
  const [partnerPhoto, setPartnerPhoto] = useState<Photo | null>(initialPartnerPhoto);
  const [partnerPosted, setPartnerPosted] = useState(partnerPostedInitial || !!initialPartnerPhoto);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const revealed = !!myPhoto; // he compartido → puedo ver el suyo

  useCoupleStream((event) => {
    if (event.type !== "photo:new") return;
    // el eco de MI propia foto no es el momento de mi pareja (bug cazado por
    // el harness E2E de it26: sin este filtro, tu foto aparecía como la suya)
    if (event.payload.userId === myId) return;
    setPartnerPosted(true);
    // guardo su contenido; solo se RENDERIZA si ya he compartido el mío
    setPartnerPhoto({ imageUrl: event.payload.imageUrl, caption: event.payload.caption });
    if (revealed) sfx.message();
  });

  async function onPick(file: File) {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, file.name);
      const result = await setDailyPhotoAction({ imageUrl: url, caption: caption.trim() || undefined });
      if (result.ok && result.data) {
        setMyPhoto(result.data);
        setCaption("");
        if (partnerPhoto) sfx.success(); // los dos hechos: pequeña celebración
      } else if (!result.ok) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const bothDone = revealed && !!partnerPhoto;

  return (
    <section className="overflow-hidden rounded-3xl border border-rose/20 bg-gradient-to-br from-rose-faint via-paper to-paper shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose/10 px-5 py-3">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-deep">
          <Sparkles className="h-4 w-4" /> El momento de hoy
        </p>
        {streak > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            {streak} {streak === 1 ? "día" : "días"} seguidos
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="font-display text-xl leading-snug text-ink md:text-2xl">{theme}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* el momento de tu pareja: revelado solo si ya compartiste el tuyo */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand bg-sand">
            {bothDone && partnerPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={partnerPhoto.imageUrl}
                  alt={`El momento de ${partnerName}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  {partnerName}
                </span>
                {partnerPhoto.caption && (
                  <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white">
                    {partnerPhoto.caption}
                  </p>
                )}
              </>
            ) : !revealed && partnerPosted ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <Lock className="h-7 w-7 text-rose/60" />
                <p className="text-sm font-medium text-ink">
                  {partnerName} ya ha compartido el suyo
                </p>
                <p className="text-xs text-ink-soft">Comparte el tuyo para verlo</p>
              </div>
            ) : !revealed ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-soft">
                <Lock className="h-7 w-7 text-rose/40" />
                <p className="max-w-[13rem] text-sm">
                  Cuando compartas el tuyo, verás el de {partnerName}
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-soft">
                <Camera className="h-7 w-7 text-rose/50" />
                <p className="max-w-[13rem] text-sm">
                  Esperando el momento de {partnerName}…
                </p>
              </div>
            )}
          </div>

          {/* el tuyo: componer o ver el enviado */}
          <div>
            {myPhoto ? (
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={myPhoto.imageUrl} alt="Tu momento" className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  Tú
                </span>
                {myPhoto.caption && (
                  <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white">
                    {myPhoto.caption}
                  </p>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-2 right-2 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-ink shadow-card transition hover:bg-white disabled:opacity-60"
                >
                  {uploading ? "…" : "Cambiar"}
                </button>
              </div>
            ) : (
              <div className="flex aspect-square flex-col justify-center rounded-2xl border border-dashed border-rose/40 bg-paper/60 p-4">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={140}
                  placeholder="Unas palabras (opcional)…"
                  className="w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none focus:ring-2 focus:ring-rose/10"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition",
                    uploading ? "bg-sand-deep text-ink-soft" : "bg-rose hover:bg-rose-deep"
                  )}
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? "Enviando…" : "Compartir mi momento"}
                </button>
                <p className="mt-2 text-center text-[11px] text-ink-soft">
                  Una foto de tu día, ahora
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPick(file);
              }}
            />
          </div>
        </div>

        {bothDone && (
          <p className="mt-3 text-center text-sm font-medium text-rose-deep">
            El momento de hoy, hecho por los dos 💞
          </p>
        )}
        {error && <p className="mt-2 text-center text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </section>
  );
}
