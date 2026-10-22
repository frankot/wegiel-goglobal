"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompany, type CompanyField } from "@/lib/company/actions";
import type { CompanyDTO } from "@/lib/db/company";

type FieldErrors = Partial<Record<CompanyField, string>>;

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
  required,
  inputMode,
  className,
  error,
}: {
  name: CompanyField;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  inputMode?: "numeric";
  className?: string;
  error?: string;
}) {
  const errorId = `company-${name}-error`;
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={`company-${name}`}>
        {label}
        {required && " *"}
      </Label>
      <Input
        id={`company-${name}`}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export function CompanyForm({ company }: { company: CompanyDTO | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErrors([]);
    setFieldErrors({});
    setSaved(false);
    startSaving(async () => {
      const res = await updateCompany(formData);
      if (!res.ok) {
        const fields = res.fieldErrors ?? {};
        setFieldErrors(fields);
        setErrors(res.errors ?? (Object.keys(fields).length ? [] : ["Nie udało się zapisać danych firmy."]));
        const first = Object.keys(fields)[0];
        if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="space-y-6"
        onChange={(e) => {
          setSaved(false);
          const name = (e.target as unknown as HTMLInputElement).name as CompanyField;
          if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
        }}
      >
        <Section title="Dane identyfikacyjne">
          <TextField
            name="name"
            error={fieldErrors.name}
            label="Pełna nazwa"
            defaultValue={company?.name}
            placeholder="np. GO GLOBAL GROUP Sp. z o.o."
            required
            className="sm:col-span-2"
          />
          <TextField
            name="shortName"
            error={fieldErrors.shortName}
            label="Nazwa skrócona"
            defaultValue={company?.shortName}
            placeholder="widoczna w panelu bocznym"
            className="sm:col-span-2"
          />
          <TextField name="nip" error={fieldErrors.nip} label="NIP" defaultValue={company?.nip} placeholder="000-000-00-00" />
          <TextField name="regon" error={fieldErrors.regon} label="REGON" defaultValue={company?.regon} inputMode="numeric" />
          <TextField name="krs" error={fieldErrors.krs} label="KRS" defaultValue={company?.krs} inputMode="numeric" />
        </Section>

        <Section title="Adres">
          <TextField
            name="street"
            error={fieldErrors.street}
            label="Ulica i numer"
            defaultValue={company?.street}
            className="sm:col-span-2"
          />
          <TextField name="postalCode" error={fieldErrors.postalCode} label="Kod pocztowy" defaultValue={company?.postalCode} placeholder="00-000" />
          <TextField name="city" error={fieldErrors.city} label="Miejscowość" defaultValue={company?.city} />
          <TextField name="country" error={fieldErrors.country} label="Kraj" defaultValue={company?.country ?? "Polska"} />
        </Section>

        {errors.length > 0 && (
          <div className="space-y-1" role="alert">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive">
                {e}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <p className="text-sm text-muted-foreground" role="status">
              Zapisano dane firmy.
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Zapisz
          </Button>
        </div>
      </form>
    </Card>
  );
}
