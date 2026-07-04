// Skeleton de la home: replica la estructura (hero + grid de cards) para
// que la carga no "salte" al llegar los datos.
function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-sand ${className ?? ""}`} />;
}

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Block className="h-3 w-40" />
          <Block className="h-8 w-64" />
        </div>
        <Block className="h-8 w-48 rounded-full" />
      </div>
      <Block className="mb-4 h-56 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Block className="h-72 md:row-span-2" />
        <Block className="h-40" />
        <Block className="h-40" />
        <Block className="h-40 md:col-span-2" />
        <Block className="h-40" />
        <Block className="h-28 md:col-span-3" />
      </div>
    </div>
  );
}
