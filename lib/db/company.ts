import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { formatNip } from "@/lib/company/identifiers";

export const COMPANY_ID = "default";

export interface CompanyDTO {
  name: string;
  shortName: string | null;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  updatedAt: string;
}

export const getCompany = cache(async (): Promise<CompanyDTO | null> => {
  const c = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  if (!c) return null;
  return {
    name: c.name,
    shortName: c.shortName,
    nip: c.nip,
    regon: c.regon,
    krs: c.krs,
    street: c.street,
    postalCode: c.postalCode,
    city: c.city,
    country: c.country,
    updatedAt: c.updatedAt.toISOString(),
  };
});

export function companyHeaderLines(c: CompanyDTO): string[] {
  const address = [
    c.street,
    [c.postalCode, c.city].filter(Boolean).join(" "),
    c.country,
  ].filter(Boolean);
  const ids = [
    c.nip && `NIP: ${formatNip(c.nip)}`,
    c.regon && `REGON: ${c.regon}`,
    c.krs && `KRS: ${c.krs}`,
  ].filter(Boolean);
  return [c.name, address.join(", "), ids.join(" · ")].filter(Boolean) as string[];
}
