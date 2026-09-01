import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES: { name: string; code: string }[] = [
  { name: "Account and Access", code: "ACCESS" },
  { name: "Hardware", code: "HARDWARE" },
  { name: "Software", code: "SOFTWARE" },
  { name: "Network", code: "NETWORK" },
];

const RELATED_SYSTEMS: { name: string; isActive: boolean }[] = [
  { name: "Email", isActive: true },
  { name: "Campus Wi-Fi", isActive: true },
  { name: "VPN", isActive: true },
  { name: "LEB2 App", isActive: true },
  { name: "Grade Submission App", isActive: true },
  { name: "Printer", isActive: true },
  { name: "Corporate Laptop", isActive: true },
  { name: "Legacy File Server", isActive: false },
];

const REQUESTERS: { name: string; email: string; isActive: boolean }[] = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.dev", isActive: true },
  { name: "Michael Brown", email: "michael.brown@toktickit.dev", isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@toktickit.dev", isActive: true },
  { name: "David Lee", email: "david.lee@toktickit.dev", isActive: true },
  { name: "Retired Alumnus", email: "retired.alumnus@toktickit.dev", isActive: false },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { code: category.code, isActive: true },
      create: { name: category.name, code: category.code, isActive: true },
    });
  }

  for (const system of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: { isActive: system.isActive },
      create: system,
    });
  }

  for (const requester of REQUESTERS) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: requester.isActive },
      create: requester,
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ${REQUESTERS.length} dev requesters.`,
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
