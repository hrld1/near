import type { Metadata } from "next";
import Link from "next/link";
import { BookHeart, Images, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCouple } from "@/lib/couple";
import { monthLabel, dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { AlbumIllustration } from "@/components/illustrations";
import { LiveRefresh } from "@/components/live-refresh";
import { MomentForm } from "@/features/moments/moment-form";
import { MultiUpload } from "@/features/moments/multi-upload";
import { DeleteMoment } from "@/features/moments/delete-moment";
import { AlbumGrid, type AlbumPhoto } from "@/features/moments/album-grid";

export const metadata: Metadata = { title: "Momentos" };
export const dynamic = "force-dynamic";

export default async function MomentsPage({
  searchParams
}: {
  searchParams: { vista?: string };
}) {
  const { user, couple, partner } = await requireCouple();
  const view = searchParams.vista === "diario" ? "diario" : "album";

  const moments = await prisma.moment.findMany({
    where: { coupleId: couple.id },
    orderBy: [{ featured: "desc" }, { happenedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
      favorites: true,
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } }
    }
  });

  const photos: AlbumPhoto[] = moments
    .filter((m) => m.imageUrl)
    .map((m) => ({
      id: m.id,
      imageUrl: m.imageUrl!,
      title: m.title,
      body: m.body,
      happenedAt: m.happenedAt.toISOString(),
      authorId: m.authorId,
      authorName: m.author.name,
      favCount: m.favorites.length,
      favByMe: m.favorites.some((f) => f.userId === user.id),
      featured: m.featured,
      tags: m.tags,
      comments: m.comments.map((c) => ({
        id: c.id,
        body: c.body,
        authorId: c.authorId,
        authorName: c.author.name,
        createdAt: c.createdAt.toISOString()
      }))
    }));

  const diaryMoments = [...moments].sort(
    (a, b) => b.happenedAt.getTime() - a.happenedAt.getTime()
  );
  const groups: { label: string; items: typeof diaryMoments }[] = [];
  for (const moment of diaryMoments) {
    const label = monthLabel(moment.happenedAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(moment);
    else groups.push({ label, items: [moment] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <LiveRefresh types={["moment"]} />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose/12 text-rose-deep">
              <BookHeart className="h-5 w-5" />
            </span>
            <h1 className="font-display text-3xl text-ink">Momentos</h1>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            El album y el diario de {user.name} y {partner?.name ?? "..."}. Solo vuestro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MultiUpload />
          <MomentForm />
        </div>
      </header>

      <div className="mb-5 flex gap-1 rounded-full bg-sand p-1">
        {[
          { key: "album", label: "Album", icon: Images, count: photos.length },
          { key: "diario", label: "Diario", icon: BookHeart, count: moments.length }
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "album" ? "/moments" : "/moments?vista=diario"}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition",
              view === tab.key ? "bg-paper text-ink shadow-card" : "text-ink-soft hover:text-ink"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="text-xs text-ink-soft">({tab.count})</span>
          </Link>
        ))}
      </div>

      {view === "album" ? (
        photos.length === 0 ? (
          <EmptyState
            illustration={<AlbumIllustration className="h-20 w-20" />}
            title="El album esta esperando su primera foto"
            description="Subid varias a la vez: se comprimen automáticamente y solo las veis vosotros dos. Marcad favoritas y dejad notas en cada una."
          />
        ) : (
          <AlbumGrid photos={photos} myId={user.id} />
        )
      ) : groups.length === 0 ? (
        <EmptyState
          icon={BookHeart}
          title="Todavia no hay recuerdos aquí"
          description="La foto de hoy, una nota pequeña, ese día que no quereis olvidar."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {group.label}
              </h2>
              <div className="space-y-4">
                {group.items.map((moment) => (
                  <article
                    key={moment.id}
                    className="group animate-fade-up overflow-hidden rounded-2xl border border-sand bg-paper shadow-card"
                  >
                    {moment.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={moment.imageUrl}
                        alt={moment.title ?? "Momento"}
                        className="max-h-[420px] w-full object-cover"
                      />
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {moment.featured && (
                            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Star className="h-2.5 w-2.5 fill-current" /> Momento especial
                            </span>
                          )}
                          {moment.title && (
                            <h3 className="font-display text-xl text-ink">{moment.title}</h3>
                          )}
                          {moment.body && (
                            <p className="mt-1.5 whitespace-pre-wrap text-read text-ink">
                              {moment.body}
                            </p>
                          )}
                        </div>
                        {moment.authorId === user.id && <DeleteMoment id={moment.id} />}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
                        <Avatar
                          name={moment.author.name}
                          size="sm"
                          tone={moment.authorId === user.id ? 0 : 1}
                          className="h-5 w-5 text-[9px]"
                        />
                        {moment.author.name} · {dateShort(moment.happenedAt)}
                        {moment.kind === "MEMORY" && " · recuerdo"}
                        {moment.favorites.length > 0 && ` · ${moment.favorites.length} fav`}
                        {moment.comments.length > 0 && ` · ${moment.comments.length} notas`}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
