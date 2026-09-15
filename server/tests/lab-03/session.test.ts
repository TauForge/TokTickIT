import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/prisma";
import { createSession, verifySessionToken, revokeSessionByToken, SESSION_TTL_MS } from "../../src/services/session";

let userId: number;

beforeAll(async () => {
  const user = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });
  userId = user!.id;
});

describe("session service", () => {
  it("creates a session and resolves it back to the user", async () => {
    const { token, expiresAt } = await createSession(userId);
    expect(token).toBeTruthy();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const resolved = await verifySessionToken(token);
    expect(resolved?.id).toBe(userId);
    expect(resolved?.role).toBe("REQUESTER");
  });

  it("SESSION_TTL_MS is a fixed 12 hours", () => {
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("returns null for an unknown token", async () => {
    await expect(verifySessionToken("not-a-real-token")).resolves.toBeNull();
  });

  it("returns null for a revoked token", async () => {
    const { token } = await createSession(userId);
    await revokeSessionByToken(token);
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("returns null for an expired token", async () => {
    const { token } = await createSession(userId);
    const hashed = await prisma.session.findFirstOrThrow({ where: { userId }, orderBy: { id: "desc" } });
    await prisma.session.update({ where: { id: hashed.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("never stores the raw token — only its SHA-256 hash", async () => {
    const { token } = await createSession(userId);
    const rows = await prisma.session.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 1 });
    expect(rows[0].tokenHash).not.toBe(token);
    expect(rows[0].tokenHash).toHaveLength(64);
  });
});
