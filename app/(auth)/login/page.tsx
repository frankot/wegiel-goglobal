"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthMessage } from "@/components/layout/auth-card";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

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
          <Label htmlFor="password">Hasło</Label>
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
