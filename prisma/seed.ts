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
      name: "Energia elektr. PL (KOBIZE 2024)",
      category: "Energia elektryczna",
      value: 0.685,
      unit: "kg CO₂e/kWh",
      source: "KOBIZE" as const,
      scope: "SCOPE_2" as const,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2025-12-31"),
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
