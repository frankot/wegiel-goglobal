"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthMessage } from "@/components/layout/auth-card";

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const passwordChanged = useSearchParams().get("haslo") === "zmienione";

  return (
    <AuthCard
      title="Zaloguj się"
      description="Dostęp do konta nadaje administrator systemu."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jan.kowalski@goglobalgroup.pl"
            autoComplete="email"
            className="h-9"
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Hasło</Label>
            <Link href="/reset-hasla" className="text-xs text-primary underline-offset-4 hover:underline">
              Nie pamiętasz hasła?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-9"
            required
          />
        </div>

        {passwordChanged && !state?.errors && (
          <AuthMessage tone="success">Hasło zostało zmienione — zaloguj się nowym hasłem.</AuthMessage>
        )}

        {state?.errors && (
          <AuthMessage>
            {state.errors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </AuthMessage>
        )}

        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? "Logowanie…" : "Zaloguj się"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
