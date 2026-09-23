import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

export const sourceSchema = z.object({
  name: z
    .string()
    .min(2, "Nazwa musi mieć min. 2 znaki")
    .max(200, "Nazwa jest za długa")
    .transform((v) => v.trim()),
  type: z.enum([
    "STATIONARY_INSTALLATION",
    "COMPANY_VEHICLE",
    "ELECTRICITY",
    "HEAT",
    "COOLING",
  ]),
  // Zakres NIE jest polem formularza — wynika z typu (patrz scopeForType).
  defaultFactorId: z.string().min(1, "Wybierz domyślny wskaźnik emisji"),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  registrationNumber: optionalText(50),
  location: optionalText(300),
  ppeNumber: optionalText(50),
  meterNumber: optionalText(50),
  supplierNip: optionalText(20),
});

export type SourceInput = z.infer<typeof sourceSchema>;
