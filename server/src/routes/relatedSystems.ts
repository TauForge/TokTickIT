import { Router } from "express";
import { prisma } from "../prisma";

export const relatedSystemsRouter = Router();

relatedSystemsRouter.get("/", async (_req, res, next) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(systems);
  } catch (error) {
    next(error);
  }
});
