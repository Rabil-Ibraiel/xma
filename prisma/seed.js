/* eslint-disable no-console */
// Run: npx prisma db seed

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Must match your Prisma enum RegionCode
const REGION_CODES = [
  "IQ_BA",
  "IQ_AN",
  "IQ_DI",
  "IQ_SU",
  "IQ_WA",
  "IQ_MU",
  "IQ_KA",
  "IQ_MA",
  "IQ_NA",
  "IQ_QA",
  "IQ_BB",
  "IQ_BG",
  "IQ_DA",
  "IQ_DQ",
  "IQ_NI",
  "IQ_SD",
  "IQ_KI",
  "IQ_AR",
];

// Arabic names only — exact ABBR and COLOR.
// All numeric fields are set to 0 in create/update below.
const PARTIES = [
  { arabicName: "ائتلاف الإعمار والتنمية", abbr: "EDC", color: "#006d65" },
  { arabicName: "دولة القانون", abbr: "SOL", color: "#677400" },
  { arabicName: "صادقون", abbr: "SDQ", color: "#004a46" },
  { arabicName: "منظمة بدر", abbr: "BADR", color: "#356e02" },
  { arabicName: "أشير بالعراق", abbr: "BSHR", color: "#a97617" },
  { arabicName: "الأساس العراقي", abbr: "ASI", color: "#0f4463" },
  { arabicName: "الحزب الديمقراطي الكردستاني", abbr: "PDK", color: "#ffc22a" },
  { arabicName: "الاتحاد الوطني الكردستاني", abbr: "PUK", color: "#007e13" },
  { arabicName: "التحالف الوطني للتصميم", abbr: "NDC", color: "#892f2f" }, // صحّح الاسم إن لزم
  { arabicName: "حزب تقدم", abbr: "TQD", color: "#f6851d" },
  { arabicName: "تحالف عزم", abbr: "AZM", color: "#a1b787" },
  { arabicName: "تحالف السيادة/تشريع", abbr: "SIA", color: "#7c5a1a" },
  { arabicName: "ائتلاف قوى الدولة الوطنية", abbr: "NSFC", color: "#085798" },
  { arabicName: "ائتلاف خدمات", abbr: "SER", color: "#0e4a78" },
];

async function main() {
  for (const p of PARTIES) {
    // 1) Upsert Party by unique abbr
    const party = await prisma.party.upsert({
      where: { abbr: p.abbr },
      update: {
        arabicName: p.arabicName,
        color: p.color,
        numberOfVoting: 0,
        lastElecChairs: 0, // ⬅️ rename to lastYearElec if that’s your column name
        thisElecChairs: 0, // ⬅️ rename to thisYearElec if that’s your column name
      },
      create: {
        arabicName: p.arabicName,
        abbr: p.abbr,
        color: p.color,
        numberOfVoting: 0,
        lastElecChairs: 0, // ⬅️ rename if needed
        thisElecChairs: 0, // ⬅️ rename if needed
      },
      select: { id: true, abbr: true },
    });

    // 2) Ensure all 18 locations for this party, each with 0 votes
    for (const code of REGION_CODES) {
      await prisma.location.upsert({
        // requires @@unique([partyId, regionCode]) in Location model
        where: { party_region_unique: { partyId: party.id, regionCode: code } },
        update: { numberOfVoting: 0 },
        create: { partyId: party.id, regionCode: code, numberOfVoting: 0 },
      });
    }

    console.log(`Seeded ${party.abbr} with ${REGION_CODES.length} locations`);
  }
}

main()
  .then(async () => {
    console.log("✅ Seeding complete");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
