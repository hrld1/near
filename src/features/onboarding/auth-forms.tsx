"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full" size="lg">
      {children}
    </Button>
  );
}

export function LoginForm({ invite }: { invite?: string }) {
  const [state, action] = useFormState(loginAction, {});
  return (
    <Card className="p-7">
      <h1 className="font-display text-2xl text-ink">Hola otra vez</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {invite ? "Entra y os vinculamos al momento." : "Entra a vuestro espacio."}
      </p>
      <form action={action} className="mt-6 space-y-4">
        {invite && <input type="hidden" name="redirectTo" value={`/join/${invite}`} />}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FieldError>{state.error}</FieldError>
        <SubmitButton>Entrar</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Primera vez aqui?{" "}
        <Link
          href={invite ? `/register?invite=${invite}` : "/register"}
          className="font-medium text-rose hover:underline"
        >
          Crea tu cuenta
        </Link>
      </p>
    </Card>
  );
}

export function RegisterForm({ invite }: { invite?: string }) {
  const [state, action] = useFormState(registerAction, {});
  return (
    <Card className="p-7">
      <h1 className="font-display text-2xl text-ink">Crear cuenta</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {invite
          ? "Crea tu cuenta y entrarás directo a vuestro espacio."
          : "Despues podras invitar a tu pareja con un codigo."}
      </p>
      <form action={action} className="mt-6 space-y-4">
        {invite && <input type="hidden" name="redirectTo" value={`/join/${invite}`} />}
        <div>
          <Label htmlFor="name">Tu nombre</Label>
          <Input id="name" name="name" autoComplete="given-name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <FieldError>{state.error}</FieldError>
        <SubmitButton>Crear cuenta</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        Ya tienes cuenta?{" "}
        <Link
          href={invite ? `/login?invite=${invite}` : "/login"}
          className="font-medium text-rose hover:underline"
        >
          Entra
        </Link>
      </p>
    </Card>
  );
}
