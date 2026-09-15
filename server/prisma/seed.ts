import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

// The 5 Lab 2 Requester identities are already materialized as User rows by
// migrations/20260915090000_lab3_auth_and_staff/migration.sql's id-preserving data copy —
// this seed adds only the Lab 3 fixtures with no Lab 2 Requester equivalent.
const SEED_PASSWORD = "DevPass123!";

const NEW_USERS: {
  email: string;
  displayName: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}[] = [
  { email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF", isActive: true, mustChangePassword: false },
  { email: "carlos.mendez@toktickit.dev", displayName: "Carlos Mendez", role: "IT_STAFF", isActive: true, mustChangePassword: false },
  { email: "priya.natarajan@toktickit.dev", displayName: "Priya Natarajan", role: "IT_STAFF", isActive: true, mustChangePassword: false },
  { email: "former.tech@toktickit.dev", displayName: "Former Technician", role: "IT_STAFF", isActive: false, mustChangePassword: false },
  { email: "admin@toktickit.dev", displayName: "System Administrator", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false },
  // FR-05/AC-02's mandatory first-login fixture — the only seeded user requiring a
  // password change. Role is IT_STAFF (a newly onboarded technician), documented as an
  // assumption since specification.md §12 doesn't pin a role for this fixture.
  { email: "onboarding@toktickit.local", displayName: "New IT Staff Onboarding", role: "IT_STAFF", isActive: true, mustChangePassword: true },
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

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  for (const user of NEW_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      create: { ...user, passwordHash },
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ${NEW_USERS.length} new Lab 3 users.`,
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
