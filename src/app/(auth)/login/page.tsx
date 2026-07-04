import type { Metadata } from "next";
import { LoginForm } from "@/features/onboarding/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return <LoginForm />;
}
