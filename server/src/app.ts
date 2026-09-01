import cors from "cors";
import express from "express";
import { prisma } from "./prisma";
import { categoriesRouter } from "./routes/categories";
import { relatedSystemsRouter } from "./routes/relatedSystems";
import { devRequestersRouter } from "./routes/devRequesters";
import { errorEnvelope } from "./middleware/errorEnvelope";

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

app.use("/api/categories", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/dev-requesters", devRequestersRouter);

app.use(errorEnvelope);

export { app };
export { prisma };
