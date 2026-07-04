import Link from "next/link";
import { Heart } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose text-white">
          <Heart className="h-5 w-5 fill-current" />
        </span>
        <span className="font-display text-3xl text-ink">Near</span>
      </Link>
      <div className="w-full max-w-sm animate-fade-up">{children}</div>
    </main>
  );
}
