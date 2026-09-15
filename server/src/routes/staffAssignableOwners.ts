import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";

export const staffAssignableOwnersRouter = Router();

staffAssignableOwnersRouter.get(
  "/",
  requireAuth,
  blockIfPasswordChangeRequired,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (_req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
        select: { id: true, displayName: true, role: true },
        orderBy: { displayName: "asc" },
      });
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },
);
