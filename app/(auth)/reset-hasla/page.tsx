"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthMessage } from "@/components/layout/auth-card";

export default function ResetPasswordRequestPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <AuthCard title="Nie pamiętasz hasła?" description="Podaj adres e-mail konta — wyślemy link do ustawienia nowego hasła.">
      {state?.ok ? (
        <div className="space-y-4">
          <AuthMessage tone="success">{state.message}</AuthMessage>
          <Link href="/login" className="block text-center text-[0.8125rem] text-primary underline-offset-4 hover:underline">
            Wróć do logowania
          </Link>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Adres e-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" className="h-9" required />
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
            {pending ? "Wysyłanie…" : "Wyślij link"}
          </Button>
          <Link href="/login" className="block text-center text-[0.8125rem] text-primary underline-offset-4 hover:underline">
            Wróć do logowania
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
