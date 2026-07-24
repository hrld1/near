import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// El estado vacío del producto. Un empty state no es un hueco: es una
// invitación a la primera acción. Admite o un icono lucide (por defecto) o una
// ilustración propia de Near (it36) para los momentos que merecen una pieza de
// arte —el primer aprecio, la primera carta— y no un icono ampliado.
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  children
}: {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sand-deep bg-paper/50 px-6 py-14 text-center">
      {illustration ? (
        <div className="mb-3">{illustration}</div>
      ) : Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-faint text-rose">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-read text-ink-soft">{description}</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
