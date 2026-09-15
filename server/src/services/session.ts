import { randomBytes, createHash } from "crypto";
import { prisma } from "../prisma";
import type { AuthenticatedUser, Role } from "../types/auth";

// BR-09: fixed 12-hour lifetime, not renewed on activity.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

// BR-11: reads isActive/mustChangePassword fresh from the User row on every call — nothing
// here is cached on the Session row, so a deactivation takes effect on the caller's very
// next request.
export async function verifySessionToken(token: string): Promise<AuthenticatedUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as Role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
