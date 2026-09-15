import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./prisma";
import { categoriesRouter } from "./routes/categories";
import { relatedSystemsRouter } from "./routes/relatedSystems";
import { ticketsRouter } from "./routes/tickets";
import { commentsRouter } from "./routes/comments";
import { attachmentsRouter } from "./routes/attachments";
import { attachmentActionsRouter } from "./routes/attachmentActions";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { staffAssignableOwnersRouter } from "./routes/staffAssignableOwners";
import { staffCommentsRouter } from "./routes/staffComments";
import { staffNotesRouter } from "./routes/staffNotes";
import { staffTicketsRouter } from "./routes/staffTickets";
import { errorEnvelope } from "./middleware/errorEnvelope";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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
app.use("/api/v1/tickets/:ticketId/attachments", attachmentsRouter);
app.use("/api/v1/tickets/:ticketId/comments", commentsRouter);
app.use("/api/v1/attachments", attachmentActionsRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1/staff/assignable-owners", staffAssignableOwnersRouter);
app.use("/api/v1/staff/tickets/:ticketId/comments", staffCommentsRouter);
app.use("/api/v1/staff/tickets/:ticketId/notes", staffNotesRouter);
app.use("/api/v1/staff/tickets", staffTicketsRouter);

app.use(errorEnvelope);

export { app };
export { prisma };
