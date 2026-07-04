import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/couple";
import { LinkPartner } from "@/features/onboarding/link-partner";

export const metadata: Metadata = { title: "Vincular pareja" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.coupleId) redirect("/home");

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-16">
      <div className="mb-8 text-center animate-fade-up">
        <h1 className="font-display text-3xl text-ink">Hola, {user.name}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Near es un espacio para dos. Para empezar, vincula tu cuenta con la
          de tu pareja.
        </p>
      </div>
      <LinkPartner />
    </div>
  );
}
