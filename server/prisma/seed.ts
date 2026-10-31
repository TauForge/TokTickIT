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

type Status = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
type Prio = "LOW" | "MEDIUM" | "HIGH";

// Lab 4 fixtures, keyed on fixed ticket numbers so reruns upsert instead of duplicating (BR-24).
// Columns: status, IT priority, owner email (null = unassigned), number of Actions Taken.
const LAB4_TICKETS: { status: Status; priority: Prio; owner: string | null; actions: number }[] = [
  { status: "NEW", priority: "LOW", owner: null, actions: 0 },
  { status: "NEW", priority: "HIGH", owner: null, actions: 0 },
  { status: "OPEN", priority: "MEDIUM", owner: "amy.tran@toktickit.dev", actions: 0 },
  { status: "OPEN", priority: "HIGH", owner: "carlos.mendez@toktickit.dev", actions: 1 },
  { status: "IN_PROGRESS", priority: "HIGH", owner: "amy.tran@toktickit.dev", actions: 3 },
  { status: "IN_PROGRESS", priority: "MEDIUM", owner: "carlos.mendez@toktickit.dev", actions: 1 },
  { status: "WAITING_FOR_REQUESTER", priority: "LOW", owner: "priya.natarajan@toktickit.dev", actions: 1 },
  { status: "WAITING_FOR_REQUESTER", priority: "MEDIUM", owner: "amy.tran@toktickit.dev", actions: 3 },
  { status: "RESOLVED", priority: "LOW", owner: "carlos.mendez@toktickit.dev", actions: 3 },
  { status: "CLOSED", priority: "MEDIUM", owner: "amy.tran@toktickit.dev", actions: 1 },
  { status: "REOPENED", priority: "HIGH", owner: "carlos.mendez@toktickit.dev", actions: 1 },
  { status: "CANCELLED", priority: "LOW", owner: null, actions: 0 },
];
const LAB4_REQUESTERS = ["jennifer.anderson@toktickit.dev", "michael.brown@toktickit.dev", "sarah.johnson@toktickit.dev"];
const LAB4_PERFORMERS = ["amy.tran@toktickit.dev", "carlos.mendez@toktickit.dev", "admin@toktickit.dev"];
const HOUR_MS = 3_600_000;

async function seedLab4(passwordHash: string) {
  const emptyRequester = { displayName: "Empty Requester", role: "REQUESTER" as const, isActive: true, mustChangePassword: false, passwordHash };
  await prisma.user.upsert({ where: { email: "empty.requester@toktickit.dev" }, update: emptyRequester, create: { email: "empty.requester@toktickit.dev", ...emptyRequester } });

  const userIds = new Map<string, number>();
  for (const email of [...LAB4_REQUESTERS, ...LAB4_PERFORMERS, ...LAB4_TICKETS.flatMap((t) => (t.owner ? [t.owner] : []))]) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, displayName: email.split("@")[0], role: LAB4_PERFORMERS.includes(email) || email.includes("priya") ? "IT_STAFF" : "REQUESTER", passwordHash },
    });
    userIds.set(email, user.id);
  }
  const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });

  for (const [index, spec] of LAB4_TICKETS.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const createdAt = new Date(Date.now() - (14 - index) * 24 * HOUR_MS);
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: `SEED4-${number}` },
      update: {},
      create: {
        ticketNumber: `SEED4-${number}`,
        summary: `Lab 4 sample ticket ${number} (${spec.status})`,
        description: `Seeded Lab 4 ticket ${number} for dashboard and Actions Taken demos.`,
        status: spec.status,
        requestedPriority: spec.priority,
        itPriority: spec.priority,
        createdAt,
        requesterId: userIds.get(LAB4_REQUESTERS[index % LAB4_REQUESTERS.length])!,
        ownerId: spec.owner ? userIds.get(spec.owner)! : null,
        categoryId: categories[index % categories.length].id,
      },
    });
    for (let i = 0; i < spec.actions; i++) {
      const performedById = userIds.get(LAB4_PERFORMERS[(index + i) % LAB4_PERFORMERS.length])!;
      await prisma.actionTaken.upsert({
        where: { performedById_idempotencyKey: { performedById, idempotencyKey: `seed4-${number}-${i + 1}` } },
        update: {},
        create: {
          ticketId: ticket.id,
          performedById,
          idempotencyKey: `seed4-${number}-${i + 1}`,
          actionAt: new Date(createdAt.getTime() + (i + 1) * HOUR_MS),
          description: `Seeded action ${i + 1} on ticket ${number}.`,
          result: i === spec.actions - 1 ? "Verified working." : "Needs another step.",
          followUpRequired: i === 0 && spec.actions === 3,
          followUpNote: i === 0 && spec.actions === 3 ? "Check again tomorrow." : null,
        },
      });
    }
  }
}

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
        // Reset the password too, not just the flags — otherwise re-seeding after an E2E
        // run that changed a fixture's password (e.g. onboarding@toktickit.local's
        // mandatory first-login flow) silently leaves the seeded credentials stale.
        passwordHash,
      },
      create: { ...user, passwordHash },
    });
  }

  await seedLab4(passwordHash);

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ${NEW_USERS.length} new Lab 3 users, ${LAB4_TICKETS.length} Lab 4 tickets.`,
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
