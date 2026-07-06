import type { Metadata } from "next";
import { LoginForm } from "@/features/onboarding/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

function normalizeInvite(raw?: string) {
  const value = (raw ?? "").trim().toUpperCase();
  return /^NEAR-[A-Z0-9]{6}$/.test(value) ? value : undefined;
}

export default function LoginPage({ searchParams }: { searchParams: { invite?: string } }) {
  return <LoginForm invite={normalizeInvite(searchParams.invite)} />;
}
