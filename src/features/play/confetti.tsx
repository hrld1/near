"use client";

const COLORS = [
  "bg-rose",
  "bg-amber-400",
  "bg-plum",
  "bg-sky-400",
  "bg-emerald-400"
];

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-around overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className={`animate-confetti ${COLORS[i % COLORS.length]} ${
            i % 3 === 0 ? "h-2 w-2 rounded-full" : "h-2.5 w-1.5 rounded-sm"
          }`}
          style={{ animationDelay: `${(i % 8) * 90}ms` }}
        />
      ))}
    </div>
  );
}
