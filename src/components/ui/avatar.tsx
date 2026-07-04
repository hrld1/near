import { cn } from "@/lib/utils";

const palette = ["bg-rose-soft text-rose-deep", "bg-sand text-plum"];

export function Avatar({
  name,
  image,
  size = "md",
  tone = 0,
  className
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  tone?: number;
  className?: string;
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        sizes[size],
        palette[tone % palette.length],
        className
      )}
    >
      {initials}
    </span>
  );
}
