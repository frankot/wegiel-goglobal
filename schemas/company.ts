import { z } from "zod";
import {
  normalizeCompanyNip,
  normalizeKrs,
  normalizeRegon,
} from "@/lib/company/identifiers";

const optionalText = (max: number) =>
  z
    .string()
    .max(max, "Wartość jest za długa")
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

/** Pole opcjonalne z normalizacją — pusta wartość przechodzi, zła nie. */
const optionalId = (normalize: (s: string) => string | null, message: string) =>
  optionalText(30).superRefine((v, ctx) => {
    if (v && !normalize(v)) ctx.addIssue({ code: "custom", message });
  }).transform((v) => (v ? normalize(v)! : undefined));

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nazwa firmy musi mieć min. 2 znaki")
    .max(300, "Nazwa firmy jest za długa"),
  shortName: optionalText(80),
  nip: optionalId(normalizeCompanyNip, "NIP jest nieprawidłowy — sprawdź cyfry."),
  regon: optionalId(normalizeRegon, "REGON jest nieprawidłowy — 9 lub 14 cyfr z poprawną sumą kontrolną."),
  krs: optionalId(normalizeKrs, "KRS musi składać się z maks. 10 cyfr."),
  street: optionalText(200),
  postalCode: optionalText(10).superRefine((v, ctx) => {
    if (v && !/^\d{2}-\d{3}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "Kod pocztowy w formacie 00-000." });
    }
  }),
  city: optionalText(100),
  country: optionalText(100),
});

export type CompanyInput = z.infer<typeof companySchema>;
