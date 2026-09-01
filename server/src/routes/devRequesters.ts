import { Router } from "express";
import { prisma } from "../prisma";

export const devRequestersRouter = Router();

devRequestersRouter.get("/", async (_req, res, next) => {
  try {
    const requesters = await prisma.requester.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(requesters);
  } catch (error) {
    next(error);
  }
});
