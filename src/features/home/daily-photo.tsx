"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { setDailyPhotoAction } from "@/actions/photo";
import { uploadFile } from "@/lib/upload-client";
import { useCoupleStream } from "@/hooks/use-stream";
import { sfx } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Photo = { imageUrl: string; caption: string | null };

// La foto del día: el hero muestra la de tu pareja (llega en vivo por
// photo:new) y abajo mandas o cambias la tuya. Sin recargar.
export function DailyPhoto({
  partnerName,
  initialPartnerPhoto,
  initialMyPhoto
}: {
  partnerName: string;
  initialPartnerPhoto: Photo | null;
  initialMyPhoto: Photo | null;
}) {
  const [partnerPhoto, setPartnerPhoto] = useState<Photo | null>(initialPartnerPhoto);
  const [myPhoto, setMyPhoto] = useState<Photo | null>(initialMyPhoto);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useCoupleStream((event) => {
    if (event.type !== "photo:new") return;
    setPartnerPhoto({ imageUrl: event.payload.imageUrl, caption: event.payload.caption });
    sfx.message();
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

  return (
    <div>
      {/* la foto de la pareja: el "Locket" */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-sand bg-sand">
        {partnerPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={partnerPhoto.imageUrl}
              alt={`El día de ${partnerName}`}
              className="h-full w-full object-cover"
            />
            {partnerPhoto.caption && (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-sm font-medium text-white">
                {partnerPhoto.caption}
              </p>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-soft">
            <Camera className="h-8 w-8 text-rose/60" />
            <p className="max-w-[14rem] text-sm">
              {partnerName} aún no te ha mandado su día
            </p>
          </div>
        )}
      </div>

      {/* mandar / cambiar la mía */}
      <div className="mt-3">
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
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={140}
          placeholder="Un pie de foto (opcional)…"
          className="mb-2 w-full rounded-xl border border-sand-deep bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-rose/50 focus:outline-none focus:ring-2 focus:ring-rose/10"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition",
            uploading ? "bg-sand-deep text-ink-soft" : "bg-rose hover:bg-rose-deep"
          )}
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? "Enviando…" : myPhoto ? "Cambiar tu día" : "Enviar tu día"}
        </button>
        {myPhoto && !uploading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={myPhoto.imageUrl} alt="Tu día" className="h-8 w-8 rounded-md object-cover" />
            <span>{partnerName} ya puede ver tu día de hoy</span>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
