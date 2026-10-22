"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { COMPANY_ID } from "@/lib/db/company";
import { companySchema } from "@/schemas/company";

export interface CompanyResult {
  ok: boolean;
  errors?: string[];
  fieldErrors?: Partial<Record<CompanyField, string>>;
}

const FIELDS = [
  "name",
  "shortName",
  "nip",
  "regon",
  "krs",
  "street",
  "postalCode",
  "city",
  "country",
] as const;

export type CompanyField = (typeof FIELDS)[number];

export async function updateCompany(formData: FormData): Promise<CompanyResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Partial<Record<CompanyField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as CompanyField;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const data = Object.fromEntries(
    FIELDS.map((f) => [f, parsed.data[f] ?? null]),
  ) as Record<CompanyField, string | null> & { name: string };

  const before = await prisma.company.findUnique({ where: { id: COMPANY_ID } });

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, ...data, updatedById: user.id },
    update: { ...data, updatedById: user.id },
  });

  const changes = Object.fromEntries(
    FIELDS.filter((f) => (before?.[f] ?? null) !== data[f]).map((f) => [
      f,
      { from: before?.[f] ?? null, to: data[f] },
    ]),
  );

  if (Object.keys(changes).length > 0) {
    await writeAudit({
      userId: user.id,
      userName: user.name || user.email,
      action: before ? "UPDATE" : "CREATE",
      entity: "Company",
      entityId: COMPANY_ID,
      details: JSON.stringify(changes),
      ipAddress: await clientIp(),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
