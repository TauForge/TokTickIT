import cors from "cors";
import express from "express";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.status(200).json({
    service: "TokTickIT API",
    message: "Project foundation is running",
  });
});

export { app };
