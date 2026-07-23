"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Send, Star, Trash2, X } from "lucide-react";
import {
  addCommentAction,
  deleteCommentAction,
  toggleFavoriteAction,
  toggleFeaturedAction
} from "@/actions/album";
import { deleteMomentAction } from "@/actions/moments";
import { dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AlbumComment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

export type AlbumPhoto = {
  id: string;
  imageUrl: string;
  title: string | null;
  body: string | null;
  happenedAt: string;
  authorId: string;
  authorName: string;
  favCount: number;
  favByMe: boolean;
  featured: boolean;
  tags: string[];
  comments: AlbumComment[];
};

export function AlbumGrid({ photos, myId }: { photos: AlbumPhoto[]; myId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(photos);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  const allTags = useMemo(
    () => [...new Set(items.flatMap((p) => p.tags))].sort(),
    [items]
  );
  const visible = items.filter(
    (p) => (!filterTag || p.tags.includes(filterTag)) && (!onlyFavs || p.favByMe || p.favCount > 0)
  );
  const featured = items.filter((p) => p.featured);
  const selected = items.find((p) => p.id === selectedId) ?? null;

  function patch(id: string, updates: Partial<AlbumPhoto>) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  function toggleFav(photo: AlbumPhoto) {
    patch(photo.id, {
      favByMe: !photo.favByMe,
      favCount: photo.favCount + (photo.favByMe ? -1 : 1)
    });
    startTransition(async () => {
      await toggleFavoriteAction(photo.id);
    });
  }

  function toggleFeatured(photo: AlbumPhoto) {
    patch(photo.id, { featured: !photo.featured });
    startTransition(async () => {
      await toggleFeaturedAction(photo.id);
    });
  }

  function sendComment(photo: AlbumPhoto) {
    const body = comment.trim();
    if (!body) return;
    setComment("");
    startTransition(async () => {
      const result = await addCommentAction({ momentId: photo.id, body });
      if (result.ok && result.data) {
        patch(photo.id, {
          comments: [
            ...photo.comments,
            { ...result.data, authorName: "Tu" }
          ]
        });
      }
    });
  }

  function removeComment(photo: AlbumPhoto, commentId: string) {
    patch(photo.id, { comments: photo.comments.filter((c) => c.id !== commentId) });
    startTransition(async () => {
      await deleteCommentAction(commentId);
    });
  }

  function removePhoto(photo: AlbumPhoto) {
    if (!confirm("Borrar esta foto del album?")) return;
    setSelectedId(null);
    setItems((prev) => prev.filter((p) => p.id !== photo.id));
    startTransition(async () => {
      await deleteMomentAction(photo.id);
      router.refresh();
    });
  }

  return (
    <div>
      {featured.length > 0 && !filterTag && !onlyFavs && (
        <section className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            <Star className="h-3.5 w-3.5 text-amber-500" /> Vuestros especiales
          </p>
          <div className="scrollbar-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
            {featured.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedId(photo.id)}
                className="group relative h-36 w-52 shrink-0 overflow-hidden rounded-2xl shadow-card transition hover:shadow-lift"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.title ?? "Especial"}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left">
                  <span className="block truncate text-xs font-medium text-white">
                    {photo.title ?? dateShort(photo.happenedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(allTags.length > 0 || items.some((p) => p.favCount > 0)) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setOnlyFavs(!onlyFavs)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
              onlyFavs
                ? "border-rose bg-rose-faint text-rose-deep"
                : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
            )}
          >
            <Heart className="h-3 w-3" /> Favoritas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filterTag === tag
                  ? "border-rose bg-rose-faint text-rose-deep"
                  : "border-sand-deep bg-paper text-ink-soft hover:bg-sand"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 [grid-auto-flow:dense] sm:grid-cols-3 md:grid-cols-4">
        {visible.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setSelectedId(photo.id)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-xl bg-sand",
              index === 0 && visible.length >= 5 && "col-span-2 row-span-2"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.imageUrl}
              alt={photo.title ?? "Foto"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-8 text-left opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              <span className="block truncate text-2xs font-medium text-white">
                {photo.title ?? dateShort(photo.happenedAt)}
              </span>
            </span>
            {photo.featured && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-400/90 p-1">
                <Star className="h-3 w-3 fill-white text-white" />
              </span>
            )}
            {(photo.favCount > 0 || photo.comments.length > 0) && (
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-2xs font-medium text-white backdrop-blur-sm">
                {photo.favCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 fill-current" /> {photo.favCount}
                  </span>
                )}
                {photo.comments.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="h-2.5 w-2.5" /> {photo.comments.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detalle */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl bg-paper shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.imageUrl}
                alt={selected.title ?? "Foto"}
                className="max-h-[52dvh] w-full object-contain"
              />
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {selected.title && (
                    <h3 className="font-display text-lg text-ink">{selected.title}</h3>
                  )}
                  <p className="text-xs text-ink-soft">
                    {selected.authorName} · {dateShort(selected.happenedAt)}
                    {selected.tags.map((t) => ` · #${t}`).join("")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => toggleFav(selected)}
                    title="Favorita"
                    className={cn(
                      "rounded-full p-2 transition",
                      selected.favByMe
                        ? "bg-rose-faint text-rose"
                        : "text-ink-soft hover:bg-sand"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", selected.favByMe && "animate-pulse-heart fill-current")} />
                  </button>
                  <button
                    onClick={() => toggleFeatured(selected)}
                    title="Momento especial"
                    className={cn(
                      "rounded-full p-2 transition",
                      selected.featured
                        ? "bg-amber-100 text-amber-500 dark:bg-amber-900/30"
                        : "text-ink-soft hover:bg-sand"
                    )}
                  >
                    <Star className={cn("h-4 w-4", selected.featured && "fill-current")} />
                  </button>
                  {selected.authorId === myId && (
                    <button
                      onClick={() => removePhoto(selected)}
                      title="Borrar"
                      className="rounded-full p-2 text-ink-soft transition hover:bg-sand hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {selected.body && <p className="mt-2 text-sm text-ink">{selected.body}</p>}

              <div className="mt-4 space-y-2">
                {selected.comments.map((c) => (
                  <div key={c.id} className="group flex items-start gap-2 text-sm">
                    <span className="font-medium text-ink">
                      {c.authorId === myId ? "Tu" : c.authorName}:
                    </span>
                    <span className="flex-1 text-ink">{c.body}</span>
                    {c.authorId === myId && (
                      <button
                        onClick={() => removeComment(selected, c.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-ink-soft" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendComment(selected);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deja una nota en esta foto..."
                  maxLength={500}
                  className="h-10 flex-1 rounded-xl border border-sand-deep bg-paper px-3 text-sm focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/15"
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || pending}
                  className="rounded-xl bg-rose px-3 text-white transition hover:bg-rose-deep disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
