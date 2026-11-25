import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { getCompany, type CompanyDTO } from "@/lib/db/company";
import { formatNip } from "@/lib/company/identifiers";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyForm } from "@/components/company/company-form";
import { Card } from "@/components/ui/card";
import { PageHeaderSkeleton } from "@/components/ui/skeleton";
import { Streamed } from "@/components/ui/streamed";
import { CompanySkeleton } from "@/components/company/skeletons";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-strong">{children || "—"}</dd>
    </div>
  );
}

function CompanyView({ company }: { company: CompanyDTO }) {
  return (
    <Card className="space-y-6 p-5">
      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Dane identyfikacyjne
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Pełna nazwa">{company.name}</Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Nazwa skrócona">{company.shortName}</Field>
          </div>
          <Field label="NIP">{company.nip && formatNip(company.nip)}</Field>
          <Field label="REGON">{company.regon}</Field>
          <Field label="KRS">{company.krs}</Field>
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Adres</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Ulica i numer">{company.street}</Field>
          </div>
          <Field label="Kod pocztowy">{company.postalCode}</Field>
          <Field label="Miejscowość">{company.city}</Field>
          <Field label="Kraj">{company.country}</Field>
        </dl>
      </section>
    </Card>
  );
}

async function Description() {
  const manage = canManage(await getCurrentUser());
  return (
    <PageHeader
      description={
        manage
          ? "Dane firmy, dla której liczony jest ślad węglowy. NIP służy do sprawdzania, czy importowana faktura jest wystawiona na firmę, a dane trafią do nagłówka raportów."
          : "Dane firmy, dla której liczony jest ślad węglowy. Zmienić je może Analityk."
      }
    />
  );
}

async function Company() {
  const [user, company] = await Promise.all([getCurrentUser(), getCompany()]);
  if (canManage(user)) return <CompanyForm company={company} />;
  if (company) return <CompanyView company={company} />;
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">
        Dane firmy nie zostały jeszcze uzupełnione — poproś Analityka o ich dodanie.
      </p>
    </Card>
  );
}

export default function CompanyPage() {
  return (
    <div className="space-y-4">
      <Streamed fallback={<PageHeaderSkeleton lines={2} />}>
        <Description />
      </Streamed>
      <Streamed fallback={<CompanySkeleton />}>
        <Company />
      </Streamed>
    </div>
  );
}
