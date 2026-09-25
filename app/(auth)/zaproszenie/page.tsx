"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { activateAccount } from "@/lib/auth/activate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthMessage } from "@/components/layout/auth-card";

function ZaproszenieForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, action, pending] = useActionState(activateAccount, null);

  if (!token) {
    return (
      <AuthCard
        title="Nieprawidłowy link"
        description="Link aktywacyjny jest nieprawidłowy albo wygasł. Poproś administratora o nowe zaproszenie."
      >
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
          Przejdź do logowania
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Aktywacja konta" description="Ustaw hasło, aby aktywować konto.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-1.5">
          <Label htmlFor="name">Imię i nazwisko</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Jan Kowalski"
            autoComplete="name"
            className="h-9"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            className="h-9"
            required
            minLength={8}
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Minimum 8 znaków, 1 wielka litera, 1 cyfra
          </p>
        </div>

        {state?.errors && (
          <AuthMessage>
            {state.errors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </AuthMessage>
        )}

        {state?.ok && <AuthMessage tone="success">Konto aktywowane! Przekierowuję…</AuthMessage>}

        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? "Aktywacja…" : "Aktywuj konto"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ZaproszeniePage() {
  return (
    <Suspense>
      <ZaproszenieForm />
    </Suspense>
  );
}
