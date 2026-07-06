import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose text-white shadow-lift">
          <Heart className="h-7 w-7 fill-current" />
        </div>
        <h1 className="font-display text-5xl tracking-tight text-ink">Near</h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          Un hogar digital para dos. Hablad, guardad momentos, contad los días
          y pasad tiempo juntos, aunque os separen kilometros.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-rose px-6 py-3 text-sm font-medium text-white shadow-card transition hover:bg-rose-deep"
          >
            Crear nuestro espacio
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-sand-deep bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-sand"
          >
            Entrar
          </Link>
        </div>
        <p className="mt-10 text-xs text-ink-soft">
          Privado por diseño: sin feed, sin seguidores, solo vosotros dos.
        </p>
      </div>
    </main>
  );
}
