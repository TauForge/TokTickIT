import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { buildRequesterDashboard, buildStaffDashboard } from "../services/dashboards";

export const dashboardRouter = Router();

dashboardRouter.get("/requester", requireAuth, blockIfPasswordChangeRequired, requireRole("REQUESTER"), async (req, res, next) => {
  try {
    res.status(200).json(await buildRequesterDashboard(prisma, req.user!.id));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/staff", requireAuth, blockIfPasswordChangeRequired, requireRole("IT_STAFF", "ADMINISTRATOR"), async (req, res, next) => {
  try {
    res.status(200).json(await buildStaffDashboard(prisma, { id: req.user!.id, role: req.user!.role }));
  } catch (error) {
    next(error);
  }
});
