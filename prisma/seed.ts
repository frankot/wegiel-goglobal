import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const factors = [
    {
      // Tabela 2 — referencyjny wskaźnik dla odbiorców końcowych, dane za 2024,
      // publikacja XII 2025. Zgodny z example/unimot-calc.md.
      name: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2024)",
      category: "Energia elektryczna",
      value: 0.553,
      unit: "kg CO₂e/kWh",
      source: "KOBIZE" as const,
      scope: "SCOPE_2" as const,
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2026-12-31"),
    },
    {
      name: "Olej napędowy (GHG Protocol)",
      category: "Paliwa ciekłe",
      value: 2.62,
      unit: "kg CO₂e/litr",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_1" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
    {
      name: "Benzyna silnikowa (GHG Protocol)",
      category: "Paliwa ciekłe",
      value: 2.3,
      unit: "kg CO₂e/litr",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_1" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
    {
      name: "LPG (GHG Protocol)",
      category: "Paliwa ciekłe",
      value: 1.66,
      unit: "kg CO₂e/litr",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_1" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
    {
      name: "Gaz ziemny (GHG Protocol)",
      category: "Paliwa gazowe",
      value: 1.99,
      unit: "kg CO₂e/m³",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_1" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
    {
      name: "Węgiel kamienny (GHG Protocol)",
      category: "Paliwa stałe",
      value: 2.45,
      unit: "kg CO₂e/kg",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_1" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
    {
      name: "Ciepło sieciowe PL (GHG Protocol)",
      category: "Ciepło",
      value: 0.38,
      unit: "kg CO₂e/kWh",
      source: "GHG_PROTOCOL" as const,
      scope: "SCOPE_2" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2027-12-31"),
    },
  ];

  for (const factor of factors) {
    const existing = await prisma.emissionFactor.findFirst({
      where: { name: factor.name },
    });
    if (!existing) {
      await prisma.emissionFactor.create({ data: factor });
      console.log(`  ✅ ${factor.name}`);
    } else {
      console.log(`  ⏭️  ${factor.name} (already exists)`);
    }
  }

  console.log(`✅ Seeded ${factors.length} emission factors`);

  // Wersja archiwalna tej samej linii wskaźnika: 0,685 za 2025 rok.
  // Dzięki temu historia wersji ma od razu co pokazać, a `resolveFactor`
  // ma realny przypadek dwóch wersji rozdzielonych datami.
  const current = await prisma.emissionFactor.findFirst({
    where: { name: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2024)" },
  });

  if (current) {
    const archived = await prisma.emissionFactor.findFirst({
      where: { parentId: current.id, validFrom: new Date("2025-01-01") },
    });
    if (!archived) {
      await prisma.emissionFactor.create({
        data: {
          name: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2023)",
          category: "Energia elektryczna",
          value: 0.685,
          unit: "kg CO₂e/kWh",
          source: "KOBIZE",
          scope: "SCOPE_2",
          validFrom: new Date("2025-01-01"),
          validTo: new Date("2025-12-31"),
          parentId: current.id,
        },
      });
      console.log("  ✅ wersja archiwalna 2025 (0,685) podpięta pod linię wersji");
    }
  }

  await seedDemoSource();
}

/**
 * Źródło emisji odpowiadające punktowi poboru z example/unimoto-x.xml.
 * Dzięki niemu import przykładowej faktury od razu trafia na EXACT po PPE.
 */
async function seedDemoSource() {
  const factor = await prisma.emissionFactor.findFirst({
    where: { category: "Energia elektryczna", parentId: null },
  });
  if (!factor) return;

  const existing = await prisma.emissionSource.findFirst({
    where: { name: "Licznik główny — Rzeszów, Boya-Żeleńskiego 11" },
  });
  if (existing) {
    console.log("  ⏭️  źródło demo (already exists)");
    return;
  }

  await prisma.emissionSource.create({
    data: {
      name: "Licznik główny — Rzeszów, Boya-Żeleńskiego 11",
      type: "ELECTRICITY",
      scope: "SCOPE_2",
      unit: "kWh",
      defaultFactorId: factor.id,
      location: "Tadeusza Boya-Żeleńskiego 11, 35-105 Rzeszów",
      ppeNumber: "590543550100711505",
      meterNumber: "50436458",
      supplierNip: "9730421440",
    },
  });
  console.log("  ✅ źródło demo z PPE 590543550100711505");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
