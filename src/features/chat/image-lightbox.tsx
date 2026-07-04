"use client";

import { X } from "lucide-react";

export function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Imagen"
        className="max-h-[90dvh] max-w-full animate-pop-in rounded-2xl object-contain"
      />
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
