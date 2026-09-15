import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { HttpError } from "../middleware/errorEnvelope";
import { hashPassword } from "../services/password";
import { validateCreateUserRequest } from "../validators/adminUserRequest";

export const adminUsersRouter = Router();

// Exported so Task 26 reuses the same gate for the edit/password sub-routes.
export const adminGate = [requireAuth, blockIfPasswordChangeRequired, requireRole("ADMINISTRATOR")];

export function toUserAdminDto(u: { id: number; email: string; displayName: string; role: string; isActive: boolean; mustChangePassword: boolean; createdAt: Date }) {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role, isActive: u.isActive, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt };
}

adminUsersRouter.get("/", ...adminGate, async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role : undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(search
          ? { OR: [{ displayName: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
          : {}),
      },
      orderBy: { displayName: "asc" },
    });
    res.status(200).json(users.map(toUserAdminDto));
  } catch (error) {
    next(error);
  }
});

adminUsersRouter.post("/", ...adminGate, async (req, res, next) => {
  try {
    const validation = validateCreateUserRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    // BR-12: case-insensitive duplicate-email check at write time.
    const existing = await prisma.user.findFirst({ where: { email: { equals: validation.value.email, mode: "insensitive" } } });
    if (existing) throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");

    const passwordHash = await hashPassword(validation.value.password);
    const created = await prisma.user.create({
      data: {
        displayName: validation.value.displayName,
        email: validation.value.email,
        role: validation.value.role,
        isActive: validation.value.isActive,
        passwordHash,
        mustChangePassword: true,
      },
    });
    res.status(201).json(toUserAdminDto(created));
  } catch (error) {
    next(error);
  }
});
