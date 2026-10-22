import { PrismaClient, Prisma } from "../lib/generated/prisma/client";
import { calculateEmission } from "../lib/emissions/calculate";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const categoryRef = (name: string) => ({
  connectOrCreate: { where: { name }, create: { name } },
});

const SEED_FACTORS = [
  {
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

async function main() {
  console.log("🌱 Seeding database...");

  for (const factor of SEED_FACTORS) {
    const existing = await prisma.emissionFactor.findFirst({
      where: {
        OR: [
          { name: factor.name },
          {
            category: { name: factor.category },
            unit: factor.unit,
            value: factor.value,
            validFrom: factor.validFrom,
            parentId: null,
          },
        ],
      },
    });
    if (!existing) {
      await prisma.emissionFactor.create({
        data: { ...factor, category: categoryRef(factor.category) },
      });
      console.log(`  ✅ ${factor.name}`);
    } else {
      console.log(`  ⏭️  ${factor.name} (already exists)`);
    }
  }

  console.log(`✅ Seeded ${SEED_FACTORS.length} emission factors`);

  const current = await prisma.emissionFactor.findFirst({
    where: {
      category: { name: "Energia elektryczna" },
      value: 0.553,
      validFrom: new Date("2026-01-01"),
      parentId: null,
    },
  });

  if (current) {
    const archived = await prisma.emissionFactor.findFirst({
      where: { parentId: current.id, validFrom: new Date("2025-01-01") },
    });
    if (!archived) {
      await prisma.emissionFactor.create({
        data: {
          name: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2023)",
          categoryId: current.categoryId,
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

  await seedDemoSources();
  await seedDemoHistory();
}

/** Demo sources */
const DEMO_SOURCES = [
  {
    name: "Licznik główny — Rzeszów, Boya-Żeleńskiego 11",
    type: "ELECTRICITY" as const,
    scope: "SCOPE_2" as const,
    unit: "kWh",
    factorName: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2024)",
    location: "Tadeusza Boya-Żeleńskiego 11, 35-105 Rzeszów",
    ppeNumber: "590543550100711505",
    meterNumber: "50436458",
    supplierNip: "9730421440",
  },
  {
    name: "Magazyn Krosno — licznik hali",
    type: "ELECTRICITY" as const,
    scope: "SCOPE_2" as const,
    unit: "kWh",
    factorName: "Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2024)",
    location: "ul. Składowa 4, 38-400 Krosno",
    ppeNumber: "590543550200418822",
    meterNumber: "71203344",
    supplierNip: "8150011223",
  },
  {
    name: "Węzeł cieplny — biuro Rzeszów",
    type: "HEAT" as const,
    scope: "SCOPE_2" as const,
    unit: "GJ",
    factorName: "Ciepło sieciowe PL (GHG Protocol)",
    location: "Tadeusza Boya-Żeleńskiego 11, 35-105 Rzeszów",
    ppeNumber: "CW-RZ-000781123",
    supplierNip: "8130013777",
  },
  {
    name: "Kotłownia gazowa — Rzeszów",
    type: "STATIONARY_INSTALLATION" as const,
    scope: "SCOPE_1" as const,
    unit: "m³",
    factorName: "Gaz ziemny (GHG Protocol)",
    location: "Tadeusza Boya-Żeleńskiego 11, 35-105 Rzeszów",
    supplierNip: "5170204455",
  },
  {
    name: "Flota samochodowa — olej napędowy",
    type: "COMPANY_VEHICLE" as const,
    scope: "SCOPE_1" as const,
    unit: "litr",
    factorName: "Olej napędowy (GHG Protocol)",
    registrationNumber: "RZ 4471K, RZ 5520M, RZ 6138P",
    location: "Baza Rzeszów",
    supplierNip: "6340128879",
  },
];

function findDemoSource(source: (typeof DEMO_SOURCES)[number]) {
  const ppeNumber = "ppeNumber" in source ? source.ppeNumber : undefined;
  return prisma.emissionSource.findFirst({
    where: { OR: [{ name: source.name }, ...(ppeNumber ? [{ ppeNumber }] : [])] },
    include: { defaultFactor: true },
  });
}

async function seedDemoSources() {
  for (const { factorName, ...source } of DEMO_SOURCES) {
    const existing = await findDemoSource({ factorName, ...source });
    if (existing) {
      console.log(`  ⏭️  ${source.name} (already exists as „${existing.name}")`);
      continue;
    }
    const seeded = SEED_FACTORS.find((f) => f.name === factorName)!;
    const factor = await prisma.emissionFactor.findFirst({
      where: {
        OR: [
          { name: factorName },
          { category: { name: seeded.category }, unit: seeded.unit, value: seeded.value, parentId: null },
        ],
      },
      orderBy: { validFrom: "desc" },
    });
    if (!factor) {
      console.log(`  ⚠️  ${source.name} — brak wskaźnika „${factorName}", pomijam`);
      continue;
    }
    await prisma.emissionSource.create({ data: { ...source, defaultFactorId: factor.id } });
    console.log(`  ✅ ${source.name}`);
  }
}

/** Demo history */
const DEMO_HISTORY = [
  {
    invoiceNumber: "UE/F2/1103911/183/06/2026/FR",
    xmlFile: "prad-rzeszow-2026-05.xml",
    supplierNip: "9730421440",
    supplierName: "UNIMOT ENERGIA i GAZ Sp. z o. o.",
    issueDate: "2026-06-10",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    source: "Licznik główny — Rzeszów, Boya-Żeleńskiego 11",
    quantity: "2590.000",
    unit: "kWh",
  },
  {
    invoiceNumber: "UE/F2/1103911/183/07/2026/FR",
    xmlFile: "prad-rzeszow-2026-06.xml",
    supplierNip: "9730421440",
    supplierName: "UNIMOT ENERGIA i GAZ Sp. z o. o.",
    issueDate: "2026-07-10",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    source: "Licznik główny — Rzeszów, Boya-Żeleńskiego 11",
    quantity: "2710.000",
    unit: "kWh",
  },
  {
    invoiceNumber: "ESP/2026/06/003877",
    xmlFile: "prad-krosno-magazyn-2026-06.xml",
    supplierNip: "8150011223",
    supplierName: "Elektro-Sprzedaż Podkarpacie Sp. z o.o.",
    issueDate: "2026-07-06",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    source: "Magazyn Krosno — licznik hali",
    quantity: "11.920",
    unit: "MWh",
  },
  {
    invoiceNumber: "GRO/F/2026/0512",
    xmlFile: "gaz-kotlownia-2026-q2.xml",
    supplierNip: "5170204455",
    supplierName: "Gazownia Rzeszowska Obrót Sp. z o.o.",
    issueDate: "2026-07-02",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    source: "Kotłownia gazowa — Rzeszów",
    quantity: "2960.000",
    unit: "m3",
  },
  {
    invoiceNumber: "FLT/06/2026/098211",
    xmlFile: "paliwo-flota-2026-06.xml",
    supplierNip: "6340128879",
    supplierName: "FLOTA-PL Stacje Paliw S.A.",
    issueDate: "2026-07-01",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    source: "Flota samochodowa — olej napędowy",
    quantity: "388.20",
    unit: "litr",
  },
  {
    invoiceNumber: "MCR/C/2026/06/2874",
    xmlFile: "cieplo-biuro-2026-06.xml",
    supplierNip: "8130013777",
    supplierName: "Miejskie Ciepło Rzeszów Sp. z o.o.",
    issueDate: "2026-07-08",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    source: "Węzeł cieplny — biuro Rzeszów",
    quantity: "12.100",
    unit: "GJ",
  },
];

function historyPayload(fileName: string) {
  const xml = readFileSync(join(__dirname, "../example/demo/historia", fileName), "utf8");
  return { format: "KSEF_XML" as const, fileName, xml };
}

async function seedDemoHistory() {
  const author = await prisma.user.findFirst({
    where: { role: "MANAGER", active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!author) {
    console.log("  ⏭️  historia faktur demo — brak konta Managera (utwórz je przez /api/setup i uruchom seed ponownie)");
    return;
  }

  for (const h of DEMO_HISTORY) {
    const existing = await prisma.invoice.findFirst({
      where: { supplierNip: h.supplierNip, invoiceNumber: h.invoiceNumber },
    });
    if (existing) {
      if (existing.rawPayload == null) {
        await prisma.invoice.update({
          where: { id: existing.id },
          data: { rawPayload: historyPayload(h.xmlFile) },
        });
        console.log(`  ✅ ${h.invoiceNumber} — dołączono oryginał XML`);
      } else {
        console.log(`  ⏭️  ${h.invoiceNumber} (already exists)`);
      }
      continue;
    }

    const demo = DEMO_SOURCES.find((d) => d.name === h.source)!;
    const source = await findDemoSource(demo);
    const factor = source?.defaultFactor;
    if (!source || !factor) {
      console.log(`  ⚠️  ${h.invoiceNumber} — brak źródła „${h.source}", pomijam`);
      continue;
    }

    const r = calculateEmission({
      quantity: h.quantity,
      quantityUnit: h.unit,
      factorValue: factor.value.toString(),
      factorUnit: factor.unit,
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: h.invoiceNumber,
        issueDate: new Date(h.issueDate),
        receiptDate: new Date(h.issueDate),
        periodStart: new Date(h.periodStart),
        periodEnd: new Date(h.periodEnd),
        sourceFormat: "KSEF_XML",
        importStatus: "PROCESSED",
        supplierNip: h.supplierNip,
        supplierName: h.supplierName,
        buyerNip: "8132990011",
        uploadedById: author.id,
        rawPayload: historyPayload(h.xmlFile),
        entries: {
          create: {
            sourceId: source.id,
            factorId: factor.id,
            entryDate: new Date(h.periodEnd),
            periodStart: new Date(h.periodStart),
            periodEnd: new Date(h.periodEnd),
            quantity: new Prisma.Decimal(r.quantity.toString()),
            unit: r.unit,
            originalQuantity: new Prisma.Decimal(h.quantity),
            originalUnit: h.unit,
            factorSnapshotValue: factor.value,
            factorSnapshotUnit: factor.unit,
            co2eKg: new Prisma.Decimal(r.co2eKg.toString()),
            co2eTon: new Prisma.Decimal(r.co2eTon.toString()),
            status: "VERIFIED",
            authorId: author.id,
            verifierId: author.id,
          },
        },
      },
    });
    console.log(`  ✅ ${h.invoiceNumber} — ${r.co2eKg.toString()} kg CO₂e`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
