import type { Metadata } from "next";
import { RegisterForm } from "@/features/onboarding/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

function normalizeInvite(raw?: string) {
  const value = (raw ?? "").trim().toUpperCase();
  return /^NEAR-[A-Z0-9]{6}$/.test(value) ? value : undefined;
}

export default function RegisterPage({ searchParams }: { searchParams: { invite?: string } }) {
  return <RegisterForm invite={normalizeInvite(searchParams.invite)} />;
}
