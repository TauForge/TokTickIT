import { Router } from "express";
import { prisma } from "../prisma";
import { HttpError } from "../middleware/errorEnvelope";
import { verifyPassword, hashPassword } from "../services/password";
import { createSession, revokeSessionByToken } from "../services/session";
import { requireAuth, COOKIE_NAME } from "../middleware/auth";
import { validateLoginRequest, validateChangePasswordRequest } from "../validators/authRequest";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function toMeDto(u: { id: number; email: string; displayName: string; role: string; mustChangePassword: boolean }) {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role, mustChangePassword: u.mustChangePassword };
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const validation = validateLoginRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    // BR-06: identical generic message whether the email is unknown or the password is wrong.
    const user = await prisma.user.findFirst({
      where: { email: { equals: validation.value.email, mode: "insensitive" } },
    });
    const passwordMatches = user ? await verifyPassword(validation.value.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (!user.isActive) {
      throw new HttpError(403, "ACCOUNT_DEACTIVATED", "This account cannot sign in right now.");
    }

    const { token, expiresAt } = await createSession(user.id);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, expires: expiresAt });
    res.status(200).json({ user: toMeDto(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (token) await revokeSessionByToken(token);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(200).json({});
  } catch (error) {
    next(error);
  }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const validation = validateChangePasswordRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const currentMatches = await verifyPassword(validation.value.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new HttpError(422, "VALIDATION_FAILED", "Current password is incorrect", [
        { field: "currentPassword", message: "INVALID_CURRENT_PASSWORD" },
      ]);
    }

    const newHash = await hashPassword(validation.value.newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    res.status(200).json(toMeDto(updated));
  } catch (error) {
    next(error);
  }
});
