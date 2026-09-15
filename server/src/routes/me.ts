import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res) => {
  // BR-13: never returns passwordHash or any other credential material — req.user only
  // ever carries the fields session.ts's verifySessionToken() maps onto AuthenticatedUser.
  res.status(200).json({
    id: req.user!.id,
    email: req.user!.email,
    displayName: req.user!.displayName,
    role: req.user!.role,
    mustChangePassword: req.user!.mustChangePassword,
  });
});
