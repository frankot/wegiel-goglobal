"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { inviteUser, type UserActionResult } from "@/lib/users/actions";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";

const ROLE_HINTS: Record<Role, string> = {
  ADMIN: "pełny dostęp, w tym konta administratorów",
  ANALYST: "edycja wszystkich danych, weryfikacja wpisów, zapraszanie użytkowników",
  USER: "podgląd danych, pobieranie raportów, dodawanie szkiców",
};

export function InviteForm({ roles }: { roles: Role[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<Role>("USER");
  const [result, setResult] = useState<UserActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    setCopied(false);
    start(async () => {
      const res = await inviteUser(formData);
      setResult(res);
      if (res.ok) formRef.current?.reset();
    });
  }

  const items = roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <Card className="px-5">
      <div>
        <h2 className="text-[0.9375rem] text-strong">Zaproś użytkownika</h2>
        <p className="text-[0.8125rem] text-muted-foreground">
          Osoba otrzyma e-mail z linkiem do ustawienia hasła. Link jest ważny 7 dni.
        </p>
      </div>

      <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start">
        <div className="space-y-1">
          <Label htmlFor="invite-email">Adres e-mail</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="jan.kowalski@firma.pl"
            aria-invalid={result?.fieldErrors?.email ? true : undefined}
            required
          />
          {result?.fieldErrors?.email && <p className="text-xs text-destructive">{result.fieldErrors.email}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-role">Rola</Label>
          <Select
            id="invite-role"
            name="role"
            items={items}
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            className="w-full"
          />
          {result?.fieldErrors?.role && <p className="text-xs text-destructive">{result.fieldErrors.role}</p>}
        </div>
        <Button type="submit" disabled={pending} className="sm:mt-6">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          Wyślij zaproszenie
        </Button>
      </form>
      <p className="-mt-2 text-xs text-muted-foreground">
        {ROLE_LABELS[role]}: {ROLE_HINTS[role]}.
      </p>

      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.message && (
        <div
          role="status"
          className={`space-y-2 rounded-sm border px-3 py-2 text-sm ${
            result.inviteUrl ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          <p>{result.message}</p>
          {result.inviteUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={result.inviteUrl} aria-label="Link aktywacyjny" className="flex-1 font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(result.inviteUrl!).then(() => setCopied(true));
                }}
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Skopiowano" : "Kopiuj link"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
