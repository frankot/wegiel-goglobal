import { z } from "zod";

const decimalString = z
  .string()
  .min(1, "Podaj wartość wskaźnika")
  .regex(/^\d+([.,]\d+)?$/, "Wartość musi być liczbą dodatnią");

export const factorSchema = z.object({
  name: z.string().min(3, "Nazwa musi mieć min. 3 znaki").max(200),
  category: z.string().min(2, "Kategoria jest wymagana").max(100),
  value: decimalString,
  unit: z
    .string()
    .min(1, "Jednostka jest wymagana")
    .refine((u) => u.includes("/"), "Jednostka musi mieć postać „kg CO₂e/kWh”"),
  source: z.enum(["KOBIZE", "GHG_PROTOCOL", "CUSTOM"]),
  scope: z.enum(["SCOPE_1", "SCOPE_2"]),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Podaj datę początku ważności"),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Podaj datę końca ważności"),
});

export const factorVersionSchema = z.object({
  parentId: z.string().min(1),
  value: decimalString,
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Podaj datę początku obowiązywania"),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Podaj datę końca obowiązywania"),
  name: z.string().max(200).optional(),
});

export type FactorInput = z.infer<typeof factorSchema>;
export type FactorVersionInput = z.infer<typeof factorVersionSchema>;
