import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { HttpError } from "../middleware/errorEnvelope";
import { hashPassword } from "../services/password";
import { ROLES, validateCreateUserRequest, validateEditUserRequest, validateSetPasswordRequest } from "../validators/adminUserRequest";

export const adminUsersRouter = Router();

// Exported so Task 26 reuses the same gate for the edit/password sub-routes.
export const adminGate = [requireAuth, blockIfPasswordChangeRequired, requireRole("ADMINISTRATOR")];

export function toUserAdminDto(u: { id: number; email: string; displayName: string; role: string; isActive: boolean; mustChangePassword: boolean; createdAt: Date }) {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role, isActive: u.isActive, mustChangePassword: u.mustChangePassword, createdAt: u.createdAt };
}

adminUsersRouter.get("/", ...adminGate, async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const roleParam = typeof req.query.role === "string" ? req.query.role : undefined;
    if (roleParam !== undefined && !ROLES.includes(roleParam)) {
      throw new HttpError(400, "INVALID_ROLE_FILTER", "role must be one of REQUESTER, IT_STAFF, ADMINISTRATOR");
    }
    const role = roleParam;

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

adminUsersRouter.patch("/:id", ...adminGate, async (req, res, next) => {
  try {
    const validation = validateEditUserRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const targetId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "NOT_FOUND", "User not found");

    const isDeactivating = target.isActive && !validation.value.isActive;

    if (isDeactivating && targetId === req.user!.id) {
      // BR-29: enforced server-side even against a directly crafted API request, and
      // unconditionally (no carve-out for admin count) — self-deactivation is checked
      // before the last-admin count, since BR-29's wording has no count exception.
      throw new HttpError(409, "SELF_DEACTIVATION_BLOCKED", "You cannot deactivate your own account");
    }

    if (isDeactivating && target.role === "ADMINISTRATOR") {
      // BR-30: checked against the live count at write time, not a cached value.
      const activeAdminCount = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });
      if (activeAdminCount <= 1) {
        throw new HttpError(409, "LAST_ADMIN_PROTECTED", "At least one active Administrator must remain");
      }
    }

    const wouldLeaveNoAdmin = target.role === "ADMINISTRATOR" && validation.value.role !== "ADMINISTRATOR";
    if (wouldLeaveNoAdmin) {
      const activeAdminCount = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });
      if (activeAdminCount <= 1) {
        throw new HttpError(409, "LAST_ADMIN_PROTECTED", "At least one active Administrator must remain");
      }
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: validation.value.email, mode: "insensitive" }, NOT: { id: targetId } },
    });
    if (existing) throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        displayName: validation.value.displayName,
        email: validation.value.email,
        role: validation.value.role,
        isActive: validation.value.isActive,
      },
    });
    res.status(200).json(toUserAdminDto(updated));
  } catch (error) {
    next(error);
  }
});

adminUsersRouter.patch("/:id/password", ...adminGate, async (req, res, next) => {
  try {
    const validation = validateSetPasswordRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const targetId = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "NOT_FOUND", "User not found");

    const passwordHash = await hashPassword(validation.value.password);
    // FR-22: the target must still pass through Change Password at their next login — the
    // Administrator's action never counts as that login itself.
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash, mustChangePassword: true },
    });
    res.status(200).json(toUserAdminDto(updated));
  } catch (error) {
    next(error);
  }
});
