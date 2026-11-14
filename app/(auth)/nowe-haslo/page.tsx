"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resetPassword } from "@/lib/auth/password-reset";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthMessage } from "@/components/layout/auth-card";

function NewPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [state, action, pending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <AuthCard title="Nieprawidłowy link" description="Link do zmiany hasła jest nieprawidłowy albo wygasł.">
        <Link href="/reset-hasla" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
          Poproś o nowy link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Ustaw nowe hasło" description="Wpisz nowe hasło do swojego konta.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1.5">
          <Label htmlFor="password">Nowe hasło</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Powtórz hasło</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" className="h-9" required />
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
          {pending ? "Zapisywanie…" : "Zapisz nowe hasło"}
        </Button>
        {state?.errors?.some((e) => e.includes("wygasł")) && (
          <Link href="/reset-hasla" className="block text-center text-[0.8125rem] text-primary underline-offset-4 hover:underline">
            Poproś o nowy link
          </Link>
        )}
      </form>
    </AuthCard>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense>
      <NewPasswordForm />
    </Suspense>
  );
}
