"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { activateAccount } from "@/lib/auth/activate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";

function ZaproszenieForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, action, pending] = useActionState(activateAccount, null);

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Leaf className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Nieprawidłowy link</CardTitle>
          <CardDescription>
            Link aktywacyjny jest nieprawidłowy. Skontaktuj się z administratorem.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Leaf className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Aktywacja konta</CardTitle>
        <CardDescription>
          Ustaw swoje hasło, aby aktywować konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Jan Kowalski"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimum 8 znaków, 1 wielka litera, 1 cyfra"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 znaków, 1 wielka litera, 1 cyfra
            </p>
          </div>

          {state?.errors && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          )}

          {state?.ok && (
            <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
              Konto aktywowane! Przekierowuję...
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Aktywacja..." : "Aktywuj konto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ZaproszeniePage() {
  return (
    <Suspense>
      <ZaproszenieForm />
    </Suspense>
  );
}
