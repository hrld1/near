// Skeleton de la arcade: hero del reto + cards de temporada/racha + grid.
function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-sand ${className ?? ""}`} />;
}

export default function PlayLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="mb-6 space-y-2">
        <Block className="h-8 w-32" />
        <Block className="h-3 w-64" />
      </div>
      <Block className="h-56 w-full rounded-3xl" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Block className="h-44" />
        <Block className="h-44" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Block className="h-36" />
        <Block className="h-36" />
        <Block className="h-36" />
        <Block className="h-36" />
      </div>
    </div>
  );
}
