"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, PenLine, Sparkles, X } from "lucide-react";
import { createMomentAction } from "@/actions/moments";
import { uploadFile } from "@/lib/upload-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KINDS = [
  { key: "PHOTO", label: "Foto", icon: Camera },
  { key: "NOTE", label: "Nota", icon: PenLine },
  { key: "MEMORY", label: "Recuerdo", icon: Sparkles }
] as const;

export function MomentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("PHOTO");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [happenedAt, setHappenedAt] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setBody("");
    setHappenedAt("");
    setTags("");
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function pick(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        let imageUrl: string | undefined;
        if (kind === "PHOTO") {
          if (!file) {
            setError("Elige una foto");
            return;
          }
          imageUrl = await uploadFile(file, file.name);
        }
        const tagList = tags
          .split(",")
          .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
          .filter(Boolean)
          .slice(0, 5);
        const result = await createMomentAction({
          kind,
          title: title || undefined,
          body: body || undefined,
          imageUrl,
          happenedAt: happenedAt || undefined,
          tags: tagList.length > 0 ? tagList : undefined
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4" /> Guardar un momento
      </Button>
    );
  }

  return (
    <Card className="animate-fade-up p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                kind === k.key
                  ? "border-rose bg-rose-faint text-rose-deep"
                  : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
              )}
            >
              <k.icon className="h-3.5 w-3.5" />
              {k.label}
            </button>
          ))}
        </div>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-sand">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3.5">
        {kind === "PHOTO" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pick(f);
              }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Previsualizacion"
                onClick={() => fileRef.current?.click()}
                className="max-h-64 w-full cursor-pointer rounded-xl object-cover"
              />
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sand-deep text-ink-soft transition hover:border-rose/50 hover:text-rose"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm">Elegir foto</span>
              </button>
            )}
          </div>
        )}
        <div>
          <Label htmlFor="m-title">Titulo {kind === "PHOTO" ? "(opcional)" : ""}</Label>
          <Input
            id="m-title"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "MEMORY" ? "El dia del aeropuerto" : "Un titulo corto"}
          />
        </div>
        <div>
          <Label htmlFor="m-body">
            {kind === "PHOTO" ? "Pie de foto (opcional)" : "Texto"}
          </Label>
          <Textarea
            id="m-body"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Cuentalo como lo recuerdas..."
          />
        </div>
        <div>
          <Label htmlFor="m-tags">Etiquetas (opcional, separadas por comas)</Label>
          <Input
            id="m-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="viaje, aniversario, tonterias"
          />
        </div>
        <div>
          <Label htmlFor="m-date">Cuando paso? (opcional)</Label>
          <Input
            id="m-date"
            type="date"
            value={happenedAt}
            onChange={(e) => setHappenedAt(e.target.value)}
          />
        </div>
        <FieldError>{error ?? undefined}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending}>
            Guardar momento
          </Button>
        </div>
      </div>
    </Card>
  );
}
