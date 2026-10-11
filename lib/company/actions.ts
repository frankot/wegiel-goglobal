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

export async function updateCompany(formData: FormData): Promise<CompanyResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }

  // Puste pole formularza czyści wartość w bazie — stąd null, nie undefined.
  const data = Object.fromEntries(
    FIELDS.map((f) => [f, parsed.data[f] ?? null]),
  ) as Record<(typeof FIELDS)[number], string | null> & { name: string };

  const before = await prisma.company.findUnique({ where: { id: COMPANY_ID } });

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, ...data, updatedById: user.id },
    update: { ...data, updatedById: user.id },
  });

  // W dzienniku tylko pola, które faktycznie się zmieniły.
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

  // Nazwa i NIP są w panelu bocznym na każdej stronie.
  revalidatePath("/", "layout");
  return { ok: true };
}
