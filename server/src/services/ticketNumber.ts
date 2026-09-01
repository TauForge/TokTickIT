import { Prisma } from "@prisma/client";

export function formatTicketNumber(year: number, sequence: number): string {
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Atomically allocates the next ticket number for `year` inside the caller's transaction.
 * upsert() compiles to a single INSERT ... ON CONFLICT (year) DO UPDATE ... RETURNING on
 * Postgres, so there is no separate create-then-catch-then-retry logic that could race —
 * concurrent first-callers for a brand-new year resolve inside one statement.
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<string> {
  const counter = await tx.ticketCounter.upsert({
    where: { year },
    update: { lastValue: { increment: 1 } },
    create: { year, lastValue: 1 },
  });

  return formatTicketNumber(year, counter.lastValue);
}
