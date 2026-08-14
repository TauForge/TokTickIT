import cors from "cors";
import express from "express";
import { prisma } from "./prisma";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.status(200).json({
    service: "TokTickIT API",
    message: "Project foundation is running",
  });
});

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

app.get("/api/categories", async (_request, response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    response.status(200).json(categories);
  } catch (error) {
    console.error("Failed to load categories", error);
    response.status(500).json({
      error: "Unable to load categories from the database.",
    });
  }
});

export { app };
