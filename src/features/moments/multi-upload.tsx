"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createMomentAction } from "@/actions/moments";
import { uploadFile } from "@/lib/upload-client";
import { compressImage } from "@/lib/image-client";
import { Button } from "@/components/ui/button";

export function MultiUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    const list = Array.from(files).slice(0, 12);
    setError(null);
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        const { blob, name } = await compressImage(list[i]);
        const url = await uploadFile(blob, name);
        const result = await createMomentAction({ kind: "PHOTO", imageUrl: url });
        if (!result.ok) failed++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    if (failed > 0) setError(`${failed} foto(s) no se pudieron subir`);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />
      <Button
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        loading={!!progress}
      >
        <ImagePlus className="h-4 w-4" />
        {progress ? `Subiendo ${progress.done}/${progress.total}...` : "Subir fotos"}
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
